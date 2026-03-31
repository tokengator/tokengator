import { and, count, eq, inArray, lt, sql } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset, assetGroup } from '@tokengator/db/schema/asset'
import {
  createHeliusResolvers,
  createHeliusSdkAdapter,
  createIndexer,
  hasPositiveAmount,
  HELIUS_COLLECTION_ASSETS,
  HELIUS_TOKEN_ACCOUNTS,
  normalizeOwnershipRows,
  type HeliusAdapter,
  type ResolverKind,
  type ResolverInput,
} from '@tokengator/indexer'

export class AssetGroupIndexConfigError extends Error {
  public constructor(message: string) {
    super(message)

    this.name = 'AssetGroupIndexConfigError'
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

export interface IndexAssetGroupOptions {
  adapter?: HeliusAdapter
  apiKey: string
  assetGroup: AssetGroupRecordForIndexing
  database?: typeof db
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

function serializeJson(value: unknown) {
  if (value == null) {
    return null
  }

  return JSON.stringify(value)
}

function createRuntimeLogger(input: { debug: boolean; logger: AssetGroupIndexLogger }): AssetGroupIndexLogger {
  return {
    debug: input.debug && input.logger.debug ? (...args) => input.logger.debug?.(...args) : undefined,
    error: input.logger.error ? (...args) => input.logger.error?.(...args) : undefined,
    info: input.logger.info ? (...args) => input.logger.info?.(...args) : undefined,
    warn: input.logger.warn ? (...args) => input.logger.warn?.(...args) : undefined,
  }
}

export async function indexAssetGroup(options: IndexAssetGroupOptions): Promise<IndexAssetGroupResult> {
  const database = options.database ?? db
  const debug = options.debug ?? false
  const logger = createRuntimeLogger({
    debug,
    logger: options.logger ?? console,
  })
  const now = options.now ?? (() => new Date())
  const resolver = getResolverInput(options.assetGroup)
  const startedAt = now()
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
  let inserted = 0
  let updated = 0

  logger.debug?.(
    `[asset-group-index:${resolver.kind}:${options.assetGroup.id}] started address=${options.assetGroup.address} heliusCluster=${options.heliusCluster} startedAt=${startedAt.toISOString()}`,
  )

  await database
    .update(assetGroup)
    .set({
      indexingStartedAt: startedAt,
    })
    .where(eq(assetGroup.id, options.assetGroup.id))

  const result = await indexer.resolveOne({
    context: {
      logger,
      signal: options.signal,
    },
    input: resolver,
    onPage: async (page: { items: unknown[]; page: number }) => {
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
          startedAt,
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

      const existingRows = await database
        .select({
          indexedAssetId: asset.indexedAssetId,
        })
        .from(asset)
        .where(
          inArray(
            asset.indexedAssetId,
            rows.map((row) => row.indexedAssetId),
          ),
        )
      const existingRowIds = new Set(existingRows.map((row) => row.indexedAssetId))

      const pageInserted = rows.filter((row) => !existingRowIds.has(row.indexedAssetId)).length
      const pageUpdated = rows.filter((row) => existingRowIds.has(row.indexedAssetId)).length

      inserted += pageInserted
      updated += pageUpdated

      await database.insert(asset).values(rows).onConflictDoUpdate({
        set: getUpsertSet(),
        target: asset.indexedAssetId,
      })

      logger.debug?.(
        `[asset-group-index:${resolver.kind}:${options.assetGroup.id}] page=${page.page} inserted=${pageInserted} updated=${pageUpdated} upserted=${rows.length}`,
      )

      return true
    },
  })

  const staleRowFilter = and(eq(asset.assetGroupId, options.assetGroup.id), lt(asset.indexedAt, startedAt))
  const [deletedRowCount] = await database
    .select({
      count: count(),
    })
    .from(asset)
    .where(staleRowFilter)

  await database.delete(asset).where(staleRowFilter)

  logger.debug?.(
    `[asset-group-index:${resolver.kind}:${options.assetGroup.id}] completed pages=${result.pages} total=${result.total} inserted=${inserted} updated=${updated} deleted=${deletedRowCount?.count ?? 0}`,
  )

  return {
    assetGroupId: options.assetGroup.id,
    deleted: deletedRowCount?.count ?? 0,
    inserted,
    pages: result.pages,
    resolverKind: resolver.kind,
    startedAt,
    total: inserted + updated,
    updated,
  }
}
