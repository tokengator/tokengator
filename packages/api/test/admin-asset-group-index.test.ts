import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { asc, eq, sql } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AssetSchema = typeof import('@tokengator/db/schema/asset')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type IndexAssetGroup = (typeof import('../src/lib/admin-asset-group-index'))['indexAssetGroup']

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')

let assetSchema: AssetSchema
let database: DatabaseClient
let indexAssetGroup: IndexAssetGroup
let tempDir = ''

function buildIndexedAssetId(input: {
  address: string
  assetGroupId: string
  owner: string
  resolverKind: 'helius-collection-assets' | 'helius-token-accounts'
}) {
  return `v2:${JSON.stringify([input.assetGroupId, input.address, input.owner, input.resolverKind])}`
}

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function getCollectionAdapter(input: {
  pageOneCursor?: string
  pageOneItems: unknown[]
  pageTwoError?: Error
  pageTwoItems?: unknown[]
}) {
  const calls: Array<{ collection: string; cursor?: string; limit: number; page: number }> = []

  return {
    adapter: {
      async getAssetsByCollection(args: { collection: string; cursor?: string; limit: number; page: number }) {
        calls.push(args)

        if (args.page === 1) {
          return {
            cursor: input.pageOneCursor,
            items: input.pageOneItems,
          }
        }

        if (input.pageTwoError) {
          throw input.pageTwoError
        }

        return {
          items: input.pageTwoItems ?? [],
        }
      },
      async getTokenAccounts() {
        throw new Error('Expected collection indexing.')
      },
    },
    calls,
  }
}

function getTokenAdapter(input: { items: unknown[] }) {
  const calls: Array<{ cursor?: string; limit: number; mint: string; page: number }> = []

  return {
    adapter: {
      async getAssetsByCollection() {
        throw new Error('Expected mint indexing.')
      },
      async getTokenAccounts(args: { cursor?: string; limit: number; mint: string; page: number }) {
        calls.push(args)

        return {
          items: input.items,
        }
      },
    },
    calls,
  }
}

async function getStoredAssets(assetGroupId: string) {
  return await database
    .select({
      address: assetSchema.asset.address,
      amount: assetSchema.asset.amount,
      assetGroupId: assetSchema.asset.assetGroupId,
      firstSeenAt: assetSchema.asset.firstSeenAt,
      indexedAssetId: assetSchema.asset.indexedAssetId,
      indexedAt: assetSchema.asset.indexedAt,
      metadataName: assetSchema.asset.metadataName,
      owner: assetSchema.asset.owner,
      resolverKind: assetSchema.asset.resolverKind,
    })
    .from(assetSchema.asset)
    .where(eq(assetSchema.asset.assetGroupId, assetGroupId))
    .orderBy(asc(assetSchema.asset.address), asc(assetSchema.asset.owner))
}

async function insertAssetGroupRecord(input: { address: string; id: string; type: 'collection' | 'mint' }) {
  const now = new Date('2026-03-31T09:00:00.000Z')

  await database.insert(assetSchema.assetGroup).values({
    address: input.address,
    createdAt: now,
    enabled: true,
    id: input.id,
    label: input.address,
    type: input.type,
    updatedAt: now,
  })
}

async function insertAssetRecord(input: {
  address: string
  amount: string
  assetGroupId: string
  firstSeenAt: Date
  indexedAt: Date
  metadataName?: string | null
  owner: string
  resolverKind: 'helius-collection-assets' | 'helius-token-accounts'
}) {
  await database.insert(assetSchema.asset).values({
    address: input.address,
    addressLower: input.address.toLowerCase(),
    amount: input.amount,
    assetGroupId: input.assetGroupId,
    firstSeenAt: input.firstSeenAt,
    id: crypto.randomUUID(),
    indexedAssetId: buildIndexedAssetId({
      address: input.address,
      assetGroupId: input.assetGroupId,
      owner: input.owner,
      resolverKind: input.resolverKind,
    }),
    indexedAt: input.indexedAt,
    lastSeenAt: input.indexedAt,
    metadata: null,
    metadataDescription: null,
    metadataImageUrl: null,
    metadataJson: null,
    metadataJsonUrl: null,
    metadataName: input.metadataName ?? null,
    metadataProgramAccount: null,
    metadataSymbol: null,
    owner: input.owner,
    ownerLower: input.owner.toLowerCase(),
    page: 1,
    raw: null,
    resolverId: input.assetGroupId,
    resolverKind: input.resolverKind,
  })
}

function syncDatabase(databaseUrl: string) {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', 'db:push', '--force'],
    cwd: DB_PACKAGE_DIR,
    env: {
      ...process.env,
      DATABASE_AUTH_TOKEN: 'test-token',
      DATABASE_URL: databaseUrl,
    },
    stderr: 'pipe',
    stdout: 'pipe',
  })

  if (result.exitCode !== 0) {
    throw new Error(`Failed to sync the test database.\n${decodeOutput(result.stdout)}\n${decodeOutput(result.stderr)}`)
  }
}

beforeAll(async () => {
  tempDir = mkdtempSync(resolve(tmpdir(), 'tokengator-api-test-'))

  const databaseUrl = pathToFileURL(resolve(tempDir, 'test.sqlite')).toString()

  process.env.BETTER_AUTH_SECRET = '12345678901234567890123456789012'
  process.env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED = 'true'
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000'
  process.env.CORS_ORIGINS = 'http://127.0.0.1:3001'
  process.env.DATABASE_AUTH_TOKEN = 'test-token'
  process.env.DATABASE_URL = databaseUrl
  process.env.DISCORD_CLIENT_ID = 'discord-client-id'
  process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  process.env.HELIUS_API_KEY = 'helius-api-key'
  process.env.HELIUS_CLUSTER = 'devnet'
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'

  syncDatabase(databaseUrl)

  ;({ db: database } = await import('@tokengator/db'))
  assetSchema = await import('@tokengator/db/schema/asset')
  ;({ indexAssetGroup } = await import('../src/lib/admin-asset-group-index'))
})

beforeEach(async () => {
  await database.delete(assetSchema.asset).where(sql`1 = 1`)
  await database.delete(assetSchema.assetGroup).where(sql`1 = 1`)
})

afterAll(() => {
  if (tempDir) {
    rmSync(tempDir, {
      force: true,
      recursive: true,
    })
  }
})

describe('indexAssetGroup', () => {
  test('indexes collection pages, selects the collection resolver, and deletes stale rows after success', async () => {
    const assetGroupId = crypto.randomUUID()
    const now = new Date('2026-03-31T10:00:00.000Z')
    const staleTime = new Date('2026-03-30T10:00:00.000Z')
    const { adapter, calls } = getCollectionAdapter({
      pageOneCursor: 'page-2',
      pageOneItems: [
        {
          content: {
            metadata: {
              name: 'Alpha',
            },
          },
          id: 'asset-a',
          ownership: {
            owner: 'wallet-a',
          },
        },
      ],
      pageTwoItems: [
        {
          content: {
            metadata: {
              name: 'Beta',
            },
          },
          id: 'asset-b',
          ownership: {
            owner: 'wallet-b',
          },
        },
      ],
    })

    await insertAssetGroupRecord({
      address: 'collection-acme',
      id: assetGroupId,
      type: 'collection',
    })
    await insertAssetRecord({
      address: 'asset-stale',
      amount: '1',
      assetGroupId,
      firstSeenAt: staleTime,
      indexedAt: staleTime,
      metadataName: 'Stale',
      owner: 'wallet-stale',
      resolverKind: 'helius-collection-assets',
    })

    const result = await indexAssetGroup({
      adapter,
      apiKey: 'helius-api-key',
      assetGroup: {
        address: 'collection-acme',
        id: assetGroupId,
        type: 'collection',
      },
      heliusCluster: 'devnet',
      now: () => now,
    })

    expect(calls).toEqual([
      {
        collection: 'collection-acme',
        cursor: undefined,
        limit: 1000,
        page: 1,
      },
      {
        collection: 'collection-acme',
        cursor: 'page-2',
        limit: 1000,
        page: 2,
      },
    ])
    expect(result).toMatchObject({
      assetGroupId,
      deleted: 1,
      inserted: 2,
      pages: 2,
      resolverKind: 'helius-collection-assets',
      startedAt: now,
      total: 2,
      updated: 0,
    })
    await expect(getStoredAssets(assetGroupId)).resolves.toMatchObject([
      {
        address: 'asset-a',
        amount: '1',
        metadataName: 'Alpha',
        owner: 'wallet-a',
        resolverKind: 'helius-collection-assets',
      },
      {
        address: 'asset-b',
        amount: '1',
        metadataName: 'Beta',
        owner: 'wallet-b',
        resolverKind: 'helius-collection-assets',
      },
    ])
  })

  test('updates existing rows, preserves firstSeenAt, and inserts new rows on rerun', async () => {
    const assetGroupId = crypto.randomUUID()
    const firstSeenAt = new Date('2026-03-29T10:00:00.000Z')
    const now = new Date('2026-03-31T11:00:00.000Z')
    const { adapter } = getCollectionAdapter({
      pageOneCursor: 'page-2',
      pageOneItems: [
        {
          content: {
            metadata: {
              name: 'Alpha Updated',
            },
          },
          id: 'asset-a',
          ownership: {
            owner: 'wallet-a',
          },
        },
      ],
      pageTwoItems: [
        {
          content: {
            metadata: {
              name: 'Gamma',
            },
          },
          id: 'asset-c',
          ownership: {
            owner: 'wallet-c',
          },
        },
      ],
    })

    await insertAssetGroupRecord({
      address: 'collection-acme',
      id: assetGroupId,
      type: 'collection',
    })
    await insertAssetRecord({
      address: 'asset-a',
      amount: '1',
      assetGroupId,
      firstSeenAt,
      indexedAt: new Date('2026-03-30T10:00:00.000Z'),
      metadataName: 'Alpha',
      owner: 'wallet-a',
      resolverKind: 'helius-collection-assets',
    })

    const result = await indexAssetGroup({
      adapter,
      apiKey: 'helius-api-key',
      assetGroup: {
        address: 'collection-acme',
        id: assetGroupId,
        type: 'collection',
      },
      heliusCluster: 'devnet',
      now: () => now,
    })

    const storedAssets = await getStoredAssets(assetGroupId)

    expect(result).toMatchObject({
      assetGroupId,
      deleted: 0,
      inserted: 1,
      pages: 2,
      resolverKind: 'helius-collection-assets',
      total: 2,
      updated: 1,
    })
    expect(storedAssets).toHaveLength(2)
    expect(storedAssets[0]).toMatchObject({
      address: 'asset-a',
      firstSeenAt,
      indexedAt: now,
      metadataName: 'Alpha Updated',
    })
  })

  test('leaves prior page writes intact and skips stale cleanup when a later page fails', async () => {
    const assetGroupId = crypto.randomUUID()
    const now = new Date('2026-03-31T12:00:00.000Z')
    const staleTime = new Date('2026-03-30T12:00:00.000Z')
    const { adapter } = getCollectionAdapter({
      pageOneCursor: 'page-2',
      pageOneItems: [
        {
          content: {
            metadata: {
              name: 'Alpha',
            },
          },
          id: 'asset-a',
          ownership: {
            owner: 'wallet-a',
          },
        },
      ],
      pageTwoError: new Error('Provider unavailable.'),
    })

    await insertAssetGroupRecord({
      address: 'collection-acme',
      id: assetGroupId,
      type: 'collection',
    })
    await insertAssetRecord({
      address: 'asset-stale',
      amount: '1',
      assetGroupId,
      firstSeenAt: staleTime,
      indexedAt: staleTime,
      metadataName: 'Stale',
      owner: 'wallet-stale',
      resolverKind: 'helius-collection-assets',
    })

    await expect(
      indexAssetGroup({
        adapter,
        apiKey: 'helius-api-key',
        assetGroup: {
          address: 'collection-acme',
          id: assetGroupId,
          type: 'collection',
        },
        heliusCluster: 'devnet',
        now: () => now,
      }),
    ).rejects.toThrow('Provider unavailable.')

    await expect(getStoredAssets(assetGroupId)).resolves.toMatchObject([
      {
        address: 'asset-a',
        indexedAt: now,
      },
      {
        address: 'asset-stale',
        indexedAt: staleTime,
      },
    ])
  })

  test('stores mint balances as exact strings, filters zero balances, and selects the mint resolver', async () => {
    const assetGroupId = crypto.randomUUID()
    const now = new Date('2026-03-31T13:00:00.000Z')
    const { adapter, calls } = getTokenAdapter({
      items: [
        {
          amount: '9007199254740993',
          mint: 'mint-a',
          owner: 'wallet-a',
        },
        {
          amount: '0',
          mint: 'mint-b',
          owner: 'wallet-b',
        },
        {
          amount: 7,
          mint: 'mint-c',
          owner: 'wallet-c',
        },
      ],
    })

    await insertAssetGroupRecord({
      address: 'mint-acme',
      id: assetGroupId,
      type: 'mint',
    })

    const result = await indexAssetGroup({
      adapter,
      apiKey: 'helius-api-key',
      assetGroup: {
        address: 'mint-acme',
        id: assetGroupId,
        type: 'mint',
      },
      heliusCluster: 'devnet',
      now: () => now,
    })

    expect(calls).toEqual([
      {
        cursor: undefined,
        limit: 1000,
        mint: 'mint-acme',
        page: 1,
      },
    ])
    expect(result).toMatchObject({
      assetGroupId,
      deleted: 0,
      inserted: 2,
      pages: 1,
      resolverKind: 'helius-token-accounts',
      total: 2,
      updated: 0,
    })
    await expect(getStoredAssets(assetGroupId)).resolves.toMatchObject([
      {
        address: 'mint-a',
        amount: '9007199254740993',
        owner: 'wallet-a',
        resolverKind: 'helius-token-accounts',
      },
      {
        address: 'mint-c',
        amount: '7',
        owner: 'wallet-c',
        resolverKind: 'helius-token-accounts',
      },
    ])
  })
})
