import { and, asc, count, desc, eq, inArray, lt, lte, sql } from 'drizzle-orm'
import { db, type Database } from '@tokengator/db'
import { asset, assetGroup, assetGroupIndexRun, assetTrait } from '@tokengator/db/schema/asset'
import {
  createHeliusResolvers,
  createHeliusSdkAdapter,
  createIndexer,
  hasPositiveAmount,
  HELIUS_COLLECTION_ASSETS,
  HELIUS_TOKEN_ACCOUNTS,
  normalizeOwnershipRows,
  type HeliusAdapter,
  type OwnershipTrait,
  type ResolverInput,
  type ResolverKind,
} from '@tokengator/indexer'
import { getAppLogger } from '@tokengator/logger'

import {
  AUTOMATION_LOCK_TIMEOUT_MS,
  getScheduledIndexIntervalMs,
  getStaleAfterMinutes,
  getStaleAfterMs,
} from '../../../lib/automation-config'
import {
  acquireAutomationLock,
  createAutomationLockLeaseController,
  getAutomationLockLeaseLostError,
  type AutomationTransaction,
  type AutomationLockLeaseController,
  AutomationLockConflictError,
  releaseAutomationLock,
} from '../../../lib/automation-lock'
import { getRunLookupChunkSize, getSqliteChunkSize, splitIntoChunks } from '../../../lib/sqlite'
import { parseStoredJsonOrValue, serializeJson } from '../../../lib/stored-json'

export type AssetGroupIndexFreshnessStatus = 'fresh' | 'stale' | 'unknown'
export type AssetGroupIndexRunStatus = 'failed' | 'running' | 'skipped' | 'succeeded'
export type AssetGroupIndexTriggerSource = 'manual' | 'scheduled'

export class AssetGroupIndexConfigError extends Error {
  public constructor(message: string) {
    super(message)

    this.name = 'AssetGroupIndexConfigError'
  }
}

class AssetGroupIndexExecutionError extends Error {
  public readonly progress: {
    deleted: number
    inserted: number
    pages: number
    resolverKind: ResolverKind
    startedAt: Date
    updated: number
  }

  public constructor(
    error: unknown,
    progress: {
      deleted: number
      inserted: number
      pages: number
      resolverKind: ResolverKind
      startedAt: Date
      updated: number
    },
  ) {
    super(error instanceof Error ? error.message : 'Asset indexing failed.', {
      cause: error,
    })

    this.name = 'AssetGroupIndexExecutionError'
    this.progress = progress
  }
}

export interface AssetGroupRecordForIndexing {
  address: string
  id: string
  type: 'collection' | 'mint'
}

export type AssetGroupIndexRunRecord = {
  assetGroupId: string
  deletedCount: number
  errorMessage: string | null
  errorPayload: unknown | null
  finishedAt: Date | null
  id: string
  insertedCount: number
  pagesProcessed: number
  resolverKind: ResolverKind
  startedAt: Date
  status: AssetGroupIndexRunStatus
  totalCount: number
  triggerSource: AssetGroupIndexTriggerSource
  updatedCount: number
}

export type AssetGroupIndexStatusSummary = {
  freshnessStatus: AssetGroupIndexFreshnessStatus
  isRunning: boolean
  lastRun: AssetGroupIndexRunRecord | null
  lastSuccessfulRun: AssetGroupIndexRunRecord | null
  staleAfterMinutes: number
}

export interface IndexAssetGroupOptions {
  adapter?: HeliusAdapter
  apiKey: string
  assetGroup: AssetGroupRecordForIndexing
  database?: Database
  heliusCluster: 'devnet' | 'mainnet'
  now?: () => Date
  signal?: AbortSignal
}

export interface IndexAssetGroupResult {
  assetGroupId: string
  deleted: number
  inserted: number
  pages: number
  resolverKind: ResolverKind
  startedAt: Date
  total: number
  updated: number
}

interface AssetGroupFacetOptionTotals {
  label: string
  total: number
}

interface AssetGroupFacetTotals {
  [groupId: string]: {
    label: string
    options: Record<string, AssetGroupFacetOptionTotals>
    total: number
  }
}

interface StoredAssetRow {
  address: string
  amount: string
  assetGroupId: string
  firstSeenAt: Date
  id: string
  indexedAssetId: string
  indexedAt: Date
  lastSeenAt: Date
  metadata: null
  metadataDescription: string | null
  metadataImageUrl: string | null
  metadataJson: string | null
  metadataJsonUrl: string | null
  metadataName: string | null
  metadataProgramAccount: string | null
  metadataSymbol: string | null
  owner: string
  page: number
  raw: null
  resolverId: string
  resolverKind: ResolverKind
}

interface StoredAssetTraitRow {
  assetGroupId: string
  assetId: string
  id: string
  traitKey: string
  traitLabel: string
  traitValue: string
  traitValueLabel: string
}

const HELIUS_NETWORK_BY_CLUSTER = {
  devnet: 'devnet',
  mainnet: 'mainnet',
} as const
const logger = getAppLogger('api', 'asset-group-index')

function buildAssetGroupIndexLockKey(assetGroupId: string) {
  return `asset-group-index:${assetGroupId}`
}

function buildAssetGroupIndexRunErrorPayload(error: unknown) {
  if (getAutomationLockLeaseLostError(error)) {
    return {
      reason: 'lock_lost',
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    }
  }

  return {
    message: 'Asset indexing failed.',
  }
}

function getExcludedColumn(columnName: string) {
  return sql.raw(`excluded.${columnName}`)
}

function getResolverInput(entry: AssetGroupRecordForIndexing): ResolverInput<
  { collection: string } | { mint: string }
> & {
  kind: ResolverKind
} {
  if (entry.type === 'collection') {
    return {
      config: {
        collection: entry.address,
      },
      id: entry.id,
      kind: HELIUS_COLLECTION_ASSETS,
    }
  }

  return {
    config: {
      mint: entry.address,
    },
    id: entry.id,
    kind: HELIUS_TOKEN_ACCOUNTS,
  }
}

function getStoredRow(input: {
  assetGroupId: string
  resolverKind: ResolverKind
  row: ReturnType<typeof normalizeOwnershipRows>[number]
  startedAt: Date
}): StoredAssetRow | null {
  const address = input.row.assetId.trim()
  const owner = input.row.owner.trim()

  if (!address || !owner) {
    return null
  }

  return {
    address,
    amount: input.row.amount,
    assetGroupId: input.assetGroupId,
    firstSeenAt: input.startedAt,
    id: crypto.randomUUID(),
    indexedAssetId: getIndexedAssetId({
      address,
      assetGroupId: input.assetGroupId,
      owner,
      resolverKind: input.resolverKind,
    }),
    indexedAt: input.startedAt,
    lastSeenAt: input.startedAt,
    metadata: null,
    metadataDescription: input.row.metadataDescription ?? null,
    metadataImageUrl: input.row.metadataImageUrl ?? null,
    metadataJson: serializeJson(input.row.metadataJson),
    metadataJsonUrl: input.row.metadataJsonUrl ?? null,
    metadataName: input.row.metadataName ?? null,
    metadataProgramAccount: input.row.metadataProgramAccount ?? null,
    metadataSymbol: input.row.metadataSymbol ?? null,
    owner,
    page: input.row.page,
    raw: null,
    resolverId: input.row.resolverId,
    resolverKind: input.resolverKind,
  }
}

async function getStoredFacetTotals(input: {
  assetGroupId: string
  database?: AutomationTransaction | Database
}): Promise<AssetGroupFacetTotals> {
  const database = input.database ?? db
  const facetOptionRows = await database
    .select({
      total: sql<number>`cast(count(distinct ${assetTrait.assetId}) as integer)`,
      traitKey: assetTrait.traitKey,
      traitLabel: sql<string>`min(${assetTrait.traitLabel})`,
      traitValue: assetTrait.traitValue,
      traitValueLabel: sql<string>`min(${assetTrait.traitValueLabel})`,
    })
    .from(assetTrait)
    .where(eq(assetTrait.assetGroupId, input.assetGroupId))
    .groupBy(assetTrait.traitKey, assetTrait.traitValue)
    .orderBy(asc(assetTrait.traitKey), asc(assetTrait.traitValue))
  const facetGroupRows = await database
    .select({
      total: sql<number>`cast(count(distinct ${assetTrait.assetId}) as integer)`,
      traitKey: assetTrait.traitKey,
      traitLabel: sql<string>`min(${assetTrait.traitLabel})`,
    })
    .from(assetTrait)
    .where(eq(assetTrait.assetGroupId, input.assetGroupId))
    .groupBy(assetTrait.traitKey)
    .orderBy(asc(assetTrait.traitKey))
  const facetTotals: AssetGroupFacetTotals = {}

  for (const facetGroupRow of facetGroupRows) {
    facetTotals[facetGroupRow.traitKey] = {
      label: facetGroupRow.traitLabel,
      options: {},
      total: Number(facetGroupRow.total),
    }
  }

  for (const facetOptionRow of facetOptionRows) {
    const facetGroup = facetTotals[facetOptionRow.traitKey] ?? {
      label: facetOptionRow.traitLabel,
      options: {},
      total: 0,
    }

    facetGroup.options[facetOptionRow.traitValue] = {
      label: facetOptionRow.traitValueLabel,
      total: Number(facetOptionRow.total),
    }
    facetTotals[facetOptionRow.traitKey] = facetGroup
  }

  return facetTotals
}

function getIndexedAssetId(input: {
  address: string
  assetGroupId: string
  owner: string
  resolverKind: ResolverKind
}) {
  return `v2:${JSON.stringify([input.assetGroupId, input.address, input.owner, input.resolverKind])}`
}

function getIndexFreshnessStatus(input: {
  lastSuccessfulRun: AssetGroupIndexRunRecord | null
  now: Date
}): AssetGroupIndexFreshnessStatus {
  if (!input.lastSuccessfulRun?.finishedAt) {
    return 'unknown'
  }

  return input.now.getTime() - input.lastSuccessfulRun.finishedAt.getTime() >
    getStaleAfterMs(getScheduledIndexIntervalMs())
    ? 'stale'
    : 'fresh'
}

function getSupportedHeliusNetwork(cluster: IndexAssetGroupOptions['heliusCluster']) {
  return HELIUS_NETWORK_BY_CLUSTER[cluster]
}

function getUpsertSet() {
  return {
    address: getExcludedColumn(asset.address.name),
    amount: getExcludedColumn(asset.amount.name),
    assetGroupId: getExcludedColumn(asset.assetGroupId.name),
    indexedAt: getExcludedColumn(asset.indexedAt.name),
    lastSeenAt: getExcludedColumn(asset.lastSeenAt.name),
    metadata: getExcludedColumn(asset.metadata.name),
    metadataDescription: getExcludedColumn(asset.metadataDescription.name),
    metadataImageUrl: getExcludedColumn(asset.metadataImageUrl.name),
    metadataJson: getExcludedColumn(asset.metadataJson.name),
    metadataJsonUrl: getExcludedColumn(asset.metadataJsonUrl.name),
    metadataName: getExcludedColumn(asset.metadataName.name),
    metadataProgramAccount: getExcludedColumn(asset.metadataProgramAccount.name),
    metadataSymbol: getExcludedColumn(asset.metadataSymbol.name),
    owner: getExcludedColumn(asset.owner.name),
    page: getExcludedColumn(asset.page.name),
    raw: getExcludedColumn(asset.raw.name),
    resolverId: getExcludedColumn(asset.resolverId.name),
    resolverKind: getExcludedColumn(asset.resolverKind.name),
  }
}

function getStoredTraitRows(input: {
  assetGroupId: string
  assetId: string
  traits?: OwnershipTrait[]
}): StoredAssetTraitRow[] {
  return (input.traits ?? []).map((trait) => ({
    assetGroupId: input.assetGroupId,
    assetId: input.assetId,
    id: crypto.randomUUID(),
    traitKey: trait.groupId,
    traitLabel: trait.groupLabel,
    traitValue: trait.value,
    traitValueLabel: trait.valueLabel,
  }))
}

function toAssetGroupIndexRunRecord(row: {
  assetGroupId: string
  deletedCount: number
  errorMessage: string | null
  errorPayload: string | null
  finishedAt: Date | null
  id: string
  insertedCount: number
  pagesProcessed: number
  resolverKind: ResolverKind
  startedAt: Date
  status: AssetGroupIndexRunStatus
  totalCount: number
  triggerSource: AssetGroupIndexTriggerSource
  updatedCount: number
}): AssetGroupIndexRunRecord {
  return {
    assetGroupId: row.assetGroupId,
    deletedCount: row.deletedCount,
    errorMessage: row.errorMessage,
    errorPayload: parseStoredJsonOrValue(row.errorPayload),
    finishedAt: row.finishedAt,
    id: row.id,
    insertedCount: row.insertedCount,
    pagesProcessed: row.pagesProcessed,
    resolverKind: row.resolverKind,
    startedAt: row.startedAt,
    status: row.status,
    totalCount: row.totalCount,
    triggerSource: row.triggerSource,
    updatedCount: row.updatedCount,
  }
}

async function executeAssetGroupIndex(
  options: IndexAssetGroupOptions & {
    leaseController: AutomationLockLeaseController
    startedAt: Date
  },
): Promise<IndexAssetGroupResult> {
  const database = options.database ?? db
  const resolver = getResolverInput(options.assetGroup)
  const adapter =
    options.adapter ??
    createHeliusSdkAdapter({
      apiKey: options.apiKey,
      network: getSupportedHeliusNetwork(options.heliusCluster),
    })
  const indexer = createIndexer({
    resolvers: createHeliusResolvers(adapter),
  })
  const progress = {
    deleted: 0,
    inserted: 0,
    pages: 0,
    resolverKind: resolver.kind,
    startedAt: options.startedAt,
    updated: 0,
  }

  logger.debug(
    '[asset-group-index:{resolverKind}:{assetGroupId}] started address={address} heliusCluster={heliusCluster} startedAt={startedAt}',
    {
      address: options.assetGroup.address,
      assetGroupId: options.assetGroup.id,
      heliusCluster: options.heliusCluster,
      resolverKind: resolver.kind,
      startedAt: options.startedAt.toISOString(),
    },
  )

  await options.leaseController.ensureOwned()
  await database
    .update(assetGroup)
    .set({
      indexingStartedAt: options.startedAt,
    })
    .where(eq(assetGroup.id, options.assetGroup.id))

  try {
    const result = await indexer.resolveOne({
      context: {
        signal: options.signal,
      },
      input: resolver,
      onPage: async (page: { items: unknown[]; page: number }) => {
        await options.leaseController.ensureOwned()
        progress.pages = Math.max(progress.pages, page.page)

        const normalizedRows = normalizeOwnershipRows({
          items: page.items,
          page: page.page,
          resolver,
        })
        const pageRows = new Map<
          string,
          {
            row: StoredAssetRow
            traits: OwnershipTrait[]
          }
        >()
        let duplicateRows = 0
        let skippedRows = 0

        for (const row of normalizedRows) {
          if (!hasPositiveAmount(row.amount)) {
            skippedRows += 1
            continue
          }

          const storedRow = getStoredRow({
            assetGroupId: options.assetGroup.id,
            resolverKind: resolver.kind,
            row,
            startedAt: options.startedAt,
          })

          if (!storedRow) {
            skippedRows += 1
            continue
          }

          if (pageRows.has(storedRow.indexedAssetId)) {
            duplicateRows += 1
          }

          pageRows.set(storedRow.indexedAssetId, {
            row: storedRow,
            traits: row.traits ?? [],
          })
        }

        const rows = [...pageRows.values()]

        logger.debug(
          '[asset-group-index:{resolverKind}:{assetGroupId}] page={page} fetched={fetched} normalized={normalized} stored={stored} skipped={skipped} duplicates={duplicates}',
          {
            assetGroupId: options.assetGroup.id,
            duplicates: duplicateRows,
            fetched: page.items.length,
            normalized: normalizedRows.length,
            page: page.page,
            resolverKind: resolver.kind,
            skipped: skippedRows,
            stored: rows.length,
          },
        )

        if (!rows.length) {
          return true
        }

        const existingAssetIdsByIndexedAssetId = new Map<string, string>()

        for (const indexedAssetIdChunk of splitIntoChunks(
          rows.map(({ row }) => row.indexedAssetId),
          getSqliteChunkSize(1),
        )) {
          const existingRows = await database
            .select({
              id: asset.id,
              indexedAssetId: asset.indexedAssetId,
            })
            .from(asset)
            .where(inArray(asset.indexedAssetId, indexedAssetIdChunk))

          for (const existingRow of existingRows) {
            existingAssetIdsByIndexedAssetId.set(existingRow.indexedAssetId, existingRow.id)
          }
        }

        const pageInserted = rows.filter(({ row }) => !existingAssetIdsByIndexedAssetId.has(row.indexedAssetId)).length
        const pageUpdated = rows.filter(({ row }) => existingAssetIdsByIndexedAssetId.has(row.indexedAssetId)).length

        const assetRows = rows.map(({ row }) => ({
          ...row,
          id: existingAssetIdsByIndexedAssetId.get(row.indexedAssetId) ?? row.id,
        }))
        const traitRows = rows.flatMap(({ row, traits }) =>
          getStoredTraitRows({
            assetGroupId: options.assetGroup.id,
            assetId: existingAssetIdsByIndexedAssetId.get(row.indexedAssetId) ?? row.id,
            traits,
          }),
        )

        await options.leaseController.ensureOwned()
        await database.transaction(async (transaction) => {
          for (const rowChunk of splitIntoChunks(assetRows, getSqliteChunkSize(Object.keys(assetRows[0]!).length))) {
            await transaction.insert(asset).values(rowChunk).onConflictDoUpdate({
              set: getUpsertSet(),
              target: asset.indexedAssetId,
            })
          }

          for (const assetIdChunk of splitIntoChunks(
            assetRows.map((row) => row.id),
            getSqliteChunkSize(1),
          )) {
            await transaction.delete(assetTrait).where(inArray(assetTrait.assetId, assetIdChunk))
          }

          if (traitRows.length > 0) {
            for (const traitRowChunk of splitIntoChunks(
              traitRows,
              getSqliteChunkSize(Object.keys(traitRows[0]!).length),
            )) {
              await transaction.insert(assetTrait).values(traitRowChunk)
            }
          }
        })

        progress.inserted += pageInserted
        progress.updated += pageUpdated

        logger.debug(
          '[asset-group-index:{resolverKind}:{assetGroupId}] page={page} inserted={inserted} updated={updated} upserted={upserted}',
          {
            assetGroupId: options.assetGroup.id,
            inserted: pageInserted,
            page: page.page,
            resolverKind: resolver.kind,
            updated: pageUpdated,
            upserted: assetRows.length,
          },
        )

        return true
      },
    })

    await options.leaseController.ensureOwned()
    const staleRowFilter = and(eq(asset.assetGroupId, options.assetGroup.id), lt(asset.indexedAt, options.startedAt))
    const [deletedRowCount] = await database
      .select({
        count: count(),
      })
      .from(asset)
      .where(staleRowFilter)

    await options.leaseController.ensureOwned()
    await database.transaction(async (transaction) => {
      await transaction.delete(asset).where(staleRowFilter)

      await transaction
        .update(assetGroup)
        .set({
          facetTotals: serializeJson(
            await getStoredFacetTotals({
              assetGroupId: options.assetGroup.id,
              database: transaction,
            }),
          ),
        })
        .where(eq(assetGroup.id, options.assetGroup.id))
    })

    progress.deleted = deletedRowCount?.count ?? 0
    progress.pages = result.pages

    logger.debug(
      '[asset-group-index:{resolverKind}:{assetGroupId}] completed pages={pages} total={total} inserted={inserted} updated={updated} deleted={deleted}',
      {
        assetGroupId: options.assetGroup.id,
        deleted: progress.deleted,
        inserted: progress.inserted,
        pages: result.pages,
        resolverKind: resolver.kind,
        total: result.total,
        updated: progress.updated,
      },
    )

    return {
      assetGroupId: options.assetGroup.id,
      deleted: progress.deleted,
      inserted: progress.inserted,
      pages: progress.pages,
      resolverKind: resolver.kind,
      startedAt: options.startedAt,
      total: progress.inserted + progress.updated,
      updated: progress.updated,
    }
  } catch (error) {
    throw new AssetGroupIndexExecutionError(error, progress)
  }
}

async function finalizeAssetGroupIndexRun(input: {
  database?: Database
  deletedCount: number
  errorMessage: string | null
  errorPayload: unknown | null
  finishedAt: Date
  insertedCount: number
  pagesProcessed: number
  runId: string
  status: AssetGroupIndexRunStatus
  totalCount: number
  updatedCount: number
}) {
  const database = input.database ?? db

  await database
    .update(assetGroupIndexRun)
    .set({
      deletedCount: input.deletedCount,
      errorMessage: input.errorMessage,
      errorPayload: serializeJson(input.errorPayload),
      finishedAt: input.finishedAt,
      insertedCount: input.insertedCount,
      pagesProcessed: input.pagesProcessed,
      status: input.status,
      totalCount: input.totalCount,
      updatedCount: input.updatedCount,
    })
    .where(and(eq(assetGroupIndexRun.id, input.runId), eq(assetGroupIndexRun.status, 'running')))
}

async function getAssetGroupIndexRunRows(input: {
  assetGroupIds: string[]
  database?: Database
  limitPerAssetGroup: number
  statuses?: AssetGroupIndexRunStatus[]
}) {
  if (input.assetGroupIds.length === 0 || input.limitPerAssetGroup < 1) {
    return []
  }

  const database = input.database ?? db
  const rows = []

  for (const assetGroupIdChunk of splitIntoChunks(
    input.assetGroupIds,
    getRunLookupChunkSize(input.statuses?.length ?? 0),
  )) {
    const filters = [inArray(assetGroupIndexRun.assetGroupId, assetGroupIdChunk)]

    if (input.statuses?.length) {
      filters.push(inArray(assetGroupIndexRun.status, input.statuses))
    }

    const rankedRuns = database
      .select({
        assetGroupId: assetGroupIndexRun.assetGroupId,
        deletedCount: assetGroupIndexRun.deletedCount,
        errorMessage: assetGroupIndexRun.errorMessage,
        errorPayload: assetGroupIndexRun.errorPayload,
        finishedAt: assetGroupIndexRun.finishedAt,
        id: assetGroupIndexRun.id,
        insertedCount: assetGroupIndexRun.insertedCount,
        pagesProcessed: assetGroupIndexRun.pagesProcessed,
        resolverKind: assetGroupIndexRun.resolverKind,
        rowNumber:
          sql<number>`row_number() over (partition by ${assetGroupIndexRun.assetGroupId} order by ${assetGroupIndexRun.startedAt} desc, ${assetGroupIndexRun.id} desc)`.as(
            'rowNumber',
          ),
        startedAt: assetGroupIndexRun.startedAt,
        status: assetGroupIndexRun.status,
        totalCount: assetGroupIndexRun.totalCount,
        triggerSource: assetGroupIndexRun.triggerSource,
        updatedCount: assetGroupIndexRun.updatedCount,
      })
      .from(assetGroupIndexRun)
      .where(and(...filters))
      .as('rankedAssetGroupIndexRun')

    rows.push(
      ...(await database
        .select({
          assetGroupId: rankedRuns.assetGroupId,
          deletedCount: rankedRuns.deletedCount,
          errorMessage: rankedRuns.errorMessage,
          errorPayload: rankedRuns.errorPayload,
          finishedAt: rankedRuns.finishedAt,
          id: rankedRuns.id,
          insertedCount: rankedRuns.insertedCount,
          pagesProcessed: rankedRuns.pagesProcessed,
          resolverKind: rankedRuns.resolverKind,
          startedAt: rankedRuns.startedAt,
          status: rankedRuns.status,
          totalCount: rankedRuns.totalCount,
          triggerSource: rankedRuns.triggerSource,
          updatedCount: rankedRuns.updatedCount,
        })
        .from(rankedRuns)
        .where(lte(rankedRuns.rowNumber, input.limitPerAssetGroup))
        .orderBy(asc(rankedRuns.assetGroupId), desc(rankedRuns.startedAt), desc(rankedRuns.id))),
    )
  }

  return rows
}

async function getAssetGroupIndexRunMaps(input: { assetGroupIds: string[]; database?: Database }) {
  const lastRunByAssetGroupId = new Map<string, AssetGroupIndexRunRecord>()
  const lastSuccessfulRunByAssetGroupId = new Map<string, AssetGroupIndexRunRecord>()
  const [lastRunRows, lastSuccessfulRunRows] = await Promise.all([
    getAssetGroupIndexRunRows({
      assetGroupIds: input.assetGroupIds,
      database: input.database,
      limitPerAssetGroup: 1,
    }),
    getAssetGroupIndexRunRows({
      assetGroupIds: input.assetGroupIds,
      database: input.database,
      limitPerAssetGroup: 1,
      statuses: ['succeeded'],
    }),
  ])

  for (const row of lastRunRows) {
    const runRecord = toAssetGroupIndexRunRecord(row)

    if (!lastRunByAssetGroupId.has(row.assetGroupId)) {
      lastRunByAssetGroupId.set(row.assetGroupId, runRecord)
    }
  }

  for (const row of lastSuccessfulRunRows) {
    const runRecord = toAssetGroupIndexRunRecord(row)

    if (!lastSuccessfulRunByAssetGroupId.has(row.assetGroupId)) {
      lastSuccessfulRunByAssetGroupId.set(row.assetGroupId, runRecord)
    }
  }

  return {
    lastRunByAssetGroupId,
    lastSuccessfulRunByAssetGroupId,
  }
}

async function markAssetGroupIndexRunFailedForExpiredLock(input: {
  currentRunId: string
  previousRunId: string
  stolenAt: Date
  transaction: AutomationTransaction
}) {
  if (input.currentRunId === input.previousRunId) {
    return
  }

  await input.transaction
    .update(assetGroupIndexRun)
    .set({
      errorMessage: 'Asset group indexing lock ownership was lost before the run completed.',
      errorPayload: JSON.stringify({
        reason: 'lock_lost',
      }),
      finishedAt: input.stolenAt,
      status: 'failed',
    })
    .where(and(eq(assetGroupIndexRun.id, input.previousRunId), eq(assetGroupIndexRun.status, 'running')))
}

async function runAssetGroupIndex(
  options: IndexAssetGroupOptions & {
    skipIfLocked: boolean
    triggerSource: AssetGroupIndexTriggerSource
  },
) {
  const database = options.database ?? db
  const now = options.now ?? (() => new Date())
  const resolver = getResolverInput(options.assetGroup)
  const runId = crypto.randomUUID()
  const startedAt = now()
  const expiresAt = new Date(startedAt.getTime() + AUTOMATION_LOCK_TIMEOUT_MS)
  const lock = await acquireAutomationLock({
    database,
    expiresAt,
    key: buildAssetGroupIndexLockKey(options.assetGroup.id),
    onStaleLockStolen: markAssetGroupIndexRunFailedForExpiredLock,
    runId,
    startedAt,
  })

  if (!lock.acquired) {
    if (options.skipIfLocked) {
      return null
    }

    throw new AutomationLockConflictError(buildAssetGroupIndexLockKey(options.assetGroup.id))
  }
  let runInserted = false
  const lockKey = buildAssetGroupIndexLockKey(options.assetGroup.id)
  const leaseController = createAutomationLockLeaseController({
    database,
    key: lockKey,
    now,
    runId,
  })
  let result: IndexAssetGroupResult | null = null

  leaseController.start()

  try {
    await leaseController.ensureOwned()
    await database.insert(assetGroupIndexRun).values({
      assetGroupId: options.assetGroup.id,
      deletedCount: 0,
      errorMessage: null,
      errorPayload: null,
      finishedAt: null,
      id: runId,
      insertedCount: 0,
      pagesProcessed: 0,
      resolverKind: resolver.kind,
      startedAt,
      status: 'running',
      totalCount: 0,
      triggerSource: options.triggerSource,
      updatedCount: 0,
    })
    runInserted = true

    result = await executeAssetGroupIndex({
      ...options,
      database,
      leaseController,
      startedAt,
    })
    const finishedAt = now()

    await leaseController.ensureOwned()
    await finalizeAssetGroupIndexRun({
      database,
      deletedCount: result.deleted,
      errorMessage: null,
      errorPayload: null,
      finishedAt,
      insertedCount: result.inserted,
      pagesProcessed: result.pages,
      runId,
      status: 'succeeded',
      totalCount: result.total,
      updatedCount: result.updated,
    })

    return result
  } catch (error) {
    const finishedAt = now()
    const progress =
      error instanceof AssetGroupIndexExecutionError
        ? error.progress
        : result
          ? {
              deleted: result.deleted,
              inserted: result.inserted,
              pages: result.pages,
              resolverKind: result.resolverKind,
              startedAt: result.startedAt,
              updated: result.updated,
            }
          : {
              deleted: 0,
              inserted: 0,
              pages: 0,
              resolverKind: resolver.kind,
              startedAt,
              updated: 0,
            }

    if (runInserted) {
      await finalizeAssetGroupIndexRun({
        database,
        deletedCount: progress.deleted,
        errorMessage: error instanceof Error ? error.message : 'Asset indexing failed.',
        errorPayload: buildAssetGroupIndexRunErrorPayload(error),
        finishedAt,
        insertedCount: progress.inserted,
        pagesProcessed: progress.pages,
        runId,
        status: 'failed',
        totalCount: progress.inserted + progress.updated,
        updatedCount: progress.updated,
      })
    }

    throw error
  } finally {
    await leaseController.stop()
    await releaseAutomationLock({
      database,
      key: lockKey,
      runId,
    })
  }
}

export async function getAssetGroupIndexStatusSummaries(input: {
  assetGroupIds: string[]
  database?: Database
  now?: () => Date
}) {
  const now = input.now?.() ?? new Date()
  const { lastRunByAssetGroupId, lastSuccessfulRunByAssetGroupId } = await getAssetGroupIndexRunMaps(input)
  const staleAfterMinutes = getStaleAfterMinutes(getScheduledIndexIntervalMs())

  return new Map(
    input.assetGroupIds.map((assetGroupId) => {
      const lastRun = lastRunByAssetGroupId.get(assetGroupId) ?? null
      const lastSuccessfulRun = lastSuccessfulRunByAssetGroupId.get(assetGroupId) ?? null

      return [
        assetGroupId,
        {
          freshnessStatus: getIndexFreshnessStatus({
            lastSuccessfulRun,
            now,
          }),
          isRunning: lastRun?.status === 'running',
          lastRun,
          lastSuccessfulRun,
          staleAfterMinutes,
        } satisfies AssetGroupIndexStatusSummary,
      ] as const
    }),
  )
}

export async function indexAssetGroup(options: IndexAssetGroupOptions): Promise<IndexAssetGroupResult> {
  const result = await runAssetGroupIndex({
    ...options,
    skipIfLocked: false,
    triggerSource: 'manual',
  })

  if (!result) {
    throw new AutomationLockConflictError(buildAssetGroupIndexLockKey(options.assetGroup.id))
  }

  return result
}

export async function listAssetGroupIndexRuns(input: { assetGroupId: string; database?: Database; limit: number }) {
  const database = input.database ?? db
  const rows = await database
    .select({
      assetGroupId: assetGroupIndexRun.assetGroupId,
      deletedCount: assetGroupIndexRun.deletedCount,
      errorMessage: assetGroupIndexRun.errorMessage,
      errorPayload: assetGroupIndexRun.errorPayload,
      finishedAt: assetGroupIndexRun.finishedAt,
      id: assetGroupIndexRun.id,
      insertedCount: assetGroupIndexRun.insertedCount,
      pagesProcessed: assetGroupIndexRun.pagesProcessed,
      resolverKind: assetGroupIndexRun.resolverKind,
      startedAt: assetGroupIndexRun.startedAt,
      status: assetGroupIndexRun.status,
      totalCount: assetGroupIndexRun.totalCount,
      triggerSource: assetGroupIndexRun.triggerSource,
      updatedCount: assetGroupIndexRun.updatedCount,
    })
    .from(assetGroupIndexRun)
    .where(eq(assetGroupIndexRun.assetGroupId, input.assetGroupId))
    .orderBy(desc(assetGroupIndexRun.startedAt), desc(assetGroupIndexRun.id))
    .limit(input.limit)

  return rows.map(toAssetGroupIndexRunRecord)
}

export async function listEnabledAssetGroupsDueForScheduledIndexing(input?: { database?: Database; now?: () => Date }) {
  const database = input?.database ?? db
  const now = input?.now?.() ?? new Date()
  const enabledAssetGroups = await database
    .select({
      address: assetGroup.address,
      id: assetGroup.id,
      type: assetGroup.type,
    })
    .from(assetGroup)
    .where(eq(assetGroup.enabled, true))
    .orderBy(asc(assetGroup.label), asc(assetGroup.type), asc(assetGroup.address))
  const lastRunByAssetGroupId = new Map(
    (
      await getAssetGroupIndexRunRows({
        assetGroupIds: enabledAssetGroups.map((entry) => entry.id),
        database,
        limitPerAssetGroup: 1,
      })
    ).map((row) => [row.assetGroupId, toAssetGroupIndexRunRecord(row)] as const),
  )

  return enabledAssetGroups.filter((entry) => {
    const lastRun = lastRunByAssetGroupId.get(entry.id)

    if (!lastRun) {
      return true
    }

    return now.getTime() - lastRun.startedAt.getTime() >= getScheduledIndexIntervalMs()
  })
}

export async function runScheduledAssetGroupIndex(options: IndexAssetGroupOptions) {
  return await runAssetGroupIndex({
    ...options,
    skipIfLocked: true,
    triggerSource: 'scheduled',
  })
}
