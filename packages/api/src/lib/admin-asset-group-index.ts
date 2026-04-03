import { and, asc, count, desc, eq, inArray, lt, lte, sql } from 'drizzle-orm'
import { db, type Database } from '@tokengator/db'
import { asset, assetGroup, assetGroupIndexRun } from '@tokengator/db/schema/asset'
import {
  createHeliusResolvers,
  createHeliusSdkAdapter,
  createIndexer,
  hasPositiveAmount,
  HELIUS_COLLECTION_ASSETS,
  HELIUS_TOKEN_ACCOUNTS,
  normalizeOwnershipRows,
  type HeliusAdapter,
  type ResolverInput,
  type ResolverKind,
} from '@tokengator/indexer'

import {
  AUTOMATION_LOCK_TIMEOUT_MS,
  getScheduledIndexIntervalMs,
  getStaleAfterMinutes,
  getStaleAfterMs,
} from './automation-config'
import {
  acquireAutomationLock,
  type AutomationTransaction,
  AutomationLockConflictError,
  releaseAutomationLock,
} from './automation-lock'
import { getRunLookupChunkSize, getSqliteChunkSize, splitIntoChunks } from './sqlite'
import { parseStoredJsonOrValue, serializeJson } from './stored-json'

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

export interface AssetGroupIndexLogger {
  debug?: (message?: unknown, ...optionalParams: unknown[]) => void
  error?: (message?: unknown, ...optionalParams: unknown[]) => void
  info?: (message?: unknown, ...optionalParams: unknown[]) => void
  warn?: (message?: unknown, ...optionalParams: unknown[]) => void
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
  debug?: boolean
  heliusCluster: 'devnet' | 'mainnet'
  logger?: AssetGroupIndexLogger
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

interface StoredAssetRow {
  address: string
  addressLower: string
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
  ownerLower: string
  page: number
  raw: null
  resolverId: string
  resolverKind: ResolverKind
}

const HELIUS_NETWORK_BY_CLUSTER = {
  devnet: 'devnet',
  mainnet: 'mainnet',
} as const

function buildAssetGroupIndexLockKey(assetGroupId: string) {
  return `asset-group-index:${assetGroupId}`
}

function buildAssetGroupIndexRunErrorPayload(error: unknown) {
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
    addressLower: address.toLowerCase(),
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
    ownerLower: owner.toLowerCase(),
    page: input.row.page,
    raw: null,
    resolverId: input.row.resolverId,
    resolverKind: input.resolverKind,
  }
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
    addressLower: getExcludedColumn(asset.addressLower.name),
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
    ownerLower: getExcludedColumn(asset.ownerLower.name),
    page: getExcludedColumn(asset.page.name),
    raw: getExcludedColumn(asset.raw.name),
    resolverId: getExcludedColumn(asset.resolverId.name),
    resolverKind: getExcludedColumn(asset.resolverKind.name),
  }
}

function createRuntimeLogger(input: { debug: boolean; logger: AssetGroupIndexLogger }): AssetGroupIndexLogger {
  return {
    debug: input.debug && input.logger.debug ? (...args) => input.logger.debug?.(...args) : undefined,
    error: input.logger.error ? (...args) => input.logger.error?.(...args) : undefined,
    info: input.logger.info ? (...args) => input.logger.info?.(...args) : undefined,
    warn: input.logger.warn ? (...args) => input.logger.warn?.(...args) : undefined,
  }
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
    startedAt: Date
  },
): Promise<IndexAssetGroupResult> {
  const database = options.database ?? db
  const debug = options.debug ?? false
  const logger = createRuntimeLogger({
    debug,
    logger: options.logger ?? console,
  })
  const resolver = getResolverInput(options.assetGroup)
  const adapter =
    options.adapter ??
    createHeliusSdkAdapter({
      apiKey: options.apiKey,
      debugRequests: debug,
      logger,
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

  logger.debug?.(
    `[asset-group-index:${resolver.kind}:${options.assetGroup.id}] started address=${options.assetGroup.address} heliusCluster=${options.heliusCluster} startedAt=${options.startedAt.toISOString()}`,
  )

  await database
    .update(assetGroup)
    .set({
      indexingStartedAt: options.startedAt,
    })
    .where(eq(assetGroup.id, options.assetGroup.id))

  try {
    const result = await indexer.resolveOne({
      context: {
        logger,
        signal: options.signal,
      },
      input: resolver,
      onPage: async (page: { items: unknown[]; page: number }) => {
        progress.pages = Math.max(progress.pages, page.page)

        const normalizedRows = normalizeOwnershipRows({
          items: page.items,
          page: page.page,
          resolver,
        })
        const pageRows = new Map<string, StoredAssetRow>()
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

          pageRows.set(storedRow.indexedAssetId, storedRow)
        }

        const rows = [...pageRows.values()]

        logger.debug?.(
          `[asset-group-index:${resolver.kind}:${options.assetGroup.id}] page=${page.page} fetched=${page.items.length} normalized=${normalizedRows.length} stored=${rows.length} skipped=${skippedRows} duplicates=${duplicateRows}`,
        )

        if (!rows.length) {
          return true
        }

        const existingRowIds = new Set<string>()

        for (const indexedAssetIdChunk of splitIntoChunks(
          rows.map((row) => row.indexedAssetId),
          getSqliteChunkSize(1),
        )) {
          const existingRows = await database
            .select({
              indexedAssetId: asset.indexedAssetId,
            })
            .from(asset)
            .where(inArray(asset.indexedAssetId, indexedAssetIdChunk))

          for (const existingRow of existingRows) {
            existingRowIds.add(existingRow.indexedAssetId)
          }
        }

        const pageInserted = rows.filter((row) => !existingRowIds.has(row.indexedAssetId)).length
        const pageUpdated = rows.filter((row) => existingRowIds.has(row.indexedAssetId)).length

        progress.inserted += pageInserted
        progress.updated += pageUpdated

        for (const rowChunk of splitIntoChunks(rows, getSqliteChunkSize(Object.keys(rows[0]!).length))) {
          await database.insert(asset).values(rowChunk).onConflictDoUpdate({
            set: getUpsertSet(),
            target: asset.indexedAssetId,
          })
        }

        logger.debug?.(
          `[asset-group-index:${resolver.kind}:${options.assetGroup.id}] page=${page.page} inserted=${pageInserted} updated=${pageUpdated} upserted=${rows.length}`,
        )

        return true
      },
    })

    const staleRowFilter = and(eq(asset.assetGroupId, options.assetGroup.id), lt(asset.indexedAt, options.startedAt))
    const [deletedRowCount] = await database
      .select({
        count: count(),
      })
      .from(asset)
      .where(staleRowFilter)

    await database.delete(asset).where(staleRowFilter)

    progress.deleted = deletedRowCount?.count ?? 0
    progress.pages = result.pages

    logger.debug?.(
      `[asset-group-index:${resolver.kind}:${options.assetGroup.id}] completed pages=${result.pages} total=${result.total} inserted=${progress.inserted} updated=${progress.updated} deleted=${progress.deleted}`,
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
      errorMessage: 'Asset group indexing lock expired before the run completed.',
      errorPayload: JSON.stringify({
        reason: 'lock_expired',
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

  try {
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

    const result = await executeAssetGroupIndex({
      ...options,
      database,
      startedAt,
    })
    const finishedAt = now()

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
    await releaseAutomationLock({
      database,
      key: buildAssetGroupIndexLockKey(options.assetGroup.id),
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
