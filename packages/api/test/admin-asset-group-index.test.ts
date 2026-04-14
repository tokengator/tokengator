import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { asc, eq, sql } from 'drizzle-orm'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AssetSchema = typeof import('@tokengator/db/schema/asset')
type AutomationSchema = typeof import('@tokengator/db/schema/automation')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type AcquireAutomationLock = (typeof import('../src/lib/automation-lock'))['acquireAutomationLock']
type CreateAutomationLockLeaseController =
  (typeof import('../src/lib/automation-lock'))['createAutomationLockLeaseController']
type ReleaseAutomationLock = (typeof import('../src/lib/automation-lock'))['releaseAutomationLock']
type RenewAutomationLock = (typeof import('../src/lib/automation-lock'))['renewAutomationLock']
type GetAssetGroupIndexStatusSummaries =
  (typeof import('../src/features/asset-group-index'))['getAssetGroupIndexStatusSummaries']
type IndexAssetGroup = (typeof import('../src/features/asset-group-index'))['indexAssetGroup']
type ListAssetGroupIndexRuns = (typeof import('../src/features/asset-group-index'))['listAssetGroupIndexRuns']
type ListEnabledAssetGroupsDueForScheduledIndexing =
  (typeof import('../src/features/asset-group-index'))['listEnabledAssetGroupsDueForScheduledIndexing']
type RunScheduledAssetGroupIndex = (typeof import('../src/features/asset-group-index'))['runScheduledAssetGroupIndex']

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')
const TEST_DATABASE_DIR = resolve(tmpdir(), 'tokengator-api-tests')
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'test.sqlite')).toString()

let assetSchema: AssetSchema
let automationSchema: AutomationSchema
let acquireAutomationLock: AcquireAutomationLock
let createAutomationLockLeaseController: CreateAutomationLockLeaseController
let database: DatabaseClient
let getAssetGroupIndexStatusSummaries: GetAssetGroupIndexStatusSummaries
let indexAssetGroup: IndexAssetGroup
let listAssetGroupIndexRuns: ListAssetGroupIndexRuns
let listEnabledAssetGroupsDueForScheduledIndexing: ListEnabledAssetGroupsDueForScheduledIndexing
let releaseAutomationLock: ReleaseAutomationLock
let renewAutomationLock: RenewAutomationLock
let runScheduledAssetGroupIndex: RunScheduledAssetGroupIndex
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

function createInsertFailureDatabase(failingTable: unknown) {
  return new Proxy(database, {
    get(target, property, receiver) {
      if (property === 'insert') {
        return (table: unknown) => {
          if (table === failingTable) {
            throw new Error('Run insert failed.')
          }

          return target.insert(table as never)
        }
      }

      if (property === 'transaction') {
        return async (callback: Parameters<DatabaseClient['transaction']>[0]) =>
          await target.transaction(async (transaction) => {
            const transactionProxy = new Proxy(transaction, {
              get(transactionTarget, transactionProperty, transactionReceiver) {
                if (transactionProperty === 'insert') {
                  return (table: unknown) => {
                    if (table === failingTable) {
                      throw new Error('Run insert failed.')
                    }

                    return transactionTarget.insert(table as never)
                  }
                }

                const transactionValue = Reflect.get(transactionTarget, transactionProperty, transactionReceiver)

                return typeof transactionValue === 'function'
                  ? transactionValue.bind(transactionTarget)
                  : transactionValue
              },
            })

            return await callback(transactionProxy)
          })
      }

      const value = Reflect.get(target, property, receiver)

      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

function createUpdateFailureDatabase(failingTable: unknown) {
  return new Proxy(database, {
    get(target, property, receiver) {
      if (property === 'transaction') {
        return async (callback: Parameters<DatabaseClient['transaction']>[0]) =>
          await target.transaction(async (transaction) => {
            const transactionProxy = new Proxy(transaction, {
              get(transactionTarget, transactionProperty, transactionReceiver) {
                if (transactionProperty === 'update') {
                  return (table: unknown) => {
                    if (table === failingTable) {
                      throw new Error('Run update failed.')
                    }

                    return transactionTarget.update(table as never)
                  }
                }

                const transactionValue = Reflect.get(transactionTarget, transactionProperty, transactionReceiver)

                return typeof transactionValue === 'function'
                  ? transactionValue.bind(transactionTarget)
                  : transactionValue
              },
            })

            return await callback(transactionProxy)
          })
      }

      const value = Reflect.get(target, property, receiver)

      return typeof value === 'function' ? value.bind(target) : value
    },
  })
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
      id: assetSchema.asset.id,
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

async function getStoredAssetTraits(assetGroupId: string) {
  return await database
    .select({
      address: assetSchema.asset.address,
      traitKey: assetSchema.assetTrait.traitKey,
      traitLabel: assetSchema.assetTrait.traitLabel,
      traitValue: assetSchema.assetTrait.traitValue,
      traitValueLabel: assetSchema.assetTrait.traitValueLabel,
    })
    .from(assetSchema.assetTrait)
    .innerJoin(assetSchema.asset, eq(assetSchema.assetTrait.assetId, assetSchema.asset.id))
    .where(eq(assetSchema.assetTrait.assetGroupId, assetGroupId))
    .orderBy(
      asc(assetSchema.asset.address),
      asc(assetSchema.assetTrait.traitKey),
      asc(assetSchema.assetTrait.traitValue),
      asc(assetSchema.assetTrait.id),
    )
}

async function getStoredFacetTotals(assetGroupId: string) {
  const [record] = await database
    .select({
      facetTotals: assetSchema.assetGroup.facetTotals,
    })
    .from(assetSchema.assetGroup)
    .where(eq(assetSchema.assetGroup.id, assetGroupId))

  return record?.facetTotals ? JSON.parse(record.facetTotals) : null
}

async function insertAssetGroupRecord(input: {
  address: string
  facetTotals?: Record<string, unknown>
  id: string
  type: 'collection' | 'mint'
}) {
  const now = new Date('2026-03-31T09:00:00.000Z')

  await database.insert(assetSchema.assetGroup).values({
    address: input.address,
    createdAt: now,
    enabled: true,
    facetTotals: input.facetTotals ? JSON.stringify(input.facetTotals) : null,
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
  traits?: Array<{ groupId: string; groupLabel: string; value: string; valueLabel: string }>
}) {
  const assetId = crypto.randomUUID()

  await database.insert(assetSchema.asset).values({
    address: input.address,
    amount: input.amount,
    assetGroupId: input.assetGroupId,
    firstSeenAt: input.firstSeenAt,
    id: assetId,
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
    page: 1,
    raw: null,
    resolverId: input.assetGroupId,
    resolverKind: input.resolverKind,
  })

  if ((input.traits ?? []).length > 0) {
    await database.insert(assetSchema.assetTrait).values(
      input.traits!.map((trait) => ({
        assetGroupId: input.assetGroupId,
        assetId,
        id: crypto.randomUUID(),
        traitKey: trait.groupId,
        traitLabel: trait.groupLabel,
        traitValue: trait.value,
        traitValueLabel: trait.valueLabel,
      })),
    )
  }
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
  mkdirSync(TEST_DATABASE_DIR, {
    recursive: true,
  })

  process.env.API_URL = 'http://127.0.0.1:3000'
  process.env.BETTER_AUTH_SECRET = '12345678901234567890123456789012'
  process.env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED = 'true'
  process.env.CORS_ORIGINS = 'http://127.0.0.1:3001'
  process.env.DATABASE_AUTH_TOKEN = 'test-token'
  process.env.DATABASE_URL = TEST_DATABASE_URL
  process.env.DISCORD_BOT_TOKEN = 'discord-bot-token'
  process.env.DISCORD_CLIENT_ID = 'discord-client-id'
  process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  process.env.HELIUS_API_KEY = 'helius-api-key'
  process.env.HELIUS_CLUSTER = 'devnet'
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'

  syncDatabase(TEST_DATABASE_URL)

  ;({ db: database } = await import('@tokengator/db'))
  assetSchema = await import('@tokengator/db/schema/asset')
  automationSchema = await import('@tokengator/db/schema/automation')
  ;({ acquireAutomationLock, createAutomationLockLeaseController, releaseAutomationLock, renewAutomationLock } =
    await import('../src/lib/automation-lock'))
  ;({
    getAssetGroupIndexStatusSummaries,
    indexAssetGroup,
    listAssetGroupIndexRuns,
    listEnabledAssetGroupsDueForScheduledIndexing,
    runScheduledAssetGroupIndex,
  } = await import('../src/features/asset-group-index'))
}, 15_000)

beforeEach(async () => {
  await database.delete(automationSchema.automationLock).where(sql`1 = 1`)
  await database.delete(assetSchema.assetTrait).where(sql`1 = 1`)
  await database.delete(assetSchema.asset).where(sql`1 = 1`)
  await database.delete(assetSchema.assetGroup).where(sql`1 = 1`)
})

afterAll(() => {})

describe('acquireAutomationLock', () => {
  test('returns acquired false when a concurrent insert wins the lock key first', async () => {
    const transaction = {
      insert() {
        return {
          values() {
            return {
              onConflictDoNothing() {
                return {
                  async returning() {
                    return []
                  },
                }
              },
            }
          },
        }
      },
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  async limit() {
                    return []
                  },
                }
              },
            }
          },
        }
      },
    }
    const fakeDatabase = {
      async transaction<T>(callback: (currentTransaction: typeof transaction) => Promise<T>) {
        return await callback(transaction)
      },
    }

    await expect(
      acquireAutomationLock({
        database: fakeDatabase as never,
        expiresAt: new Date('2026-04-04T10:05:00.000Z'),
        key: 'community-sync:org-1',
        runId: 'run-1',
        startedAt: new Date('2026-04-04T10:00:00.000Z'),
      }),
    ).resolves.toEqual({
      acquired: false,
      staleRunId: null,
    })
  })
})

describe('renewAutomationLock', () => {
  test('extends the lease while the current run still owns the lock', async () => {
    const startedAt = new Date('2026-04-04T10:00:00.000Z')
    const key = 'community-sync:org-1'

    await acquireAutomationLock({
      database,
      expiresAt: new Date('2026-04-04T10:15:00.000Z'),
      key,
      runId: 'run-1',
      startedAt,
    })

    await expect(
      renewAutomationLock({
        database,
        key,
        now: new Date('2026-04-04T10:05:00.000Z'),
        runId: 'run-1',
      }),
    ).resolves.toEqual({
      expiresAt: new Date('2026-04-04T10:20:00.000Z'),
      renewed: true,
    })
  })

  test('returns renewed false after the lease has already expired', async () => {
    const startedAt = new Date('2026-04-04T10:00:00.000Z')
    const key = 'community-sync:org-2'

    await acquireAutomationLock({
      database,
      expiresAt: new Date('2026-04-04T10:15:00.000Z'),
      key,
      runId: 'run-2',
      startedAt,
    })

    await expect(
      renewAutomationLock({
        database,
        key,
        now: new Date('2026-04-04T10:16:00.000Z'),
        runId: 'run-2',
      }),
    ).resolves.toEqual({
      expiresAt: null,
      renewed: false,
    })
  })

  test('returns renewed false after another run steals the lock and release stays a no-op', async () => {
    const key = 'community-sync:org-3'
    const stolenAt = new Date('2026-04-04T10:16:00.000Z')

    await acquireAutomationLock({
      database,
      expiresAt: new Date('2026-04-04T10:15:00.000Z'),
      key,
      runId: 'run-3',
      startedAt: new Date('2026-04-04T10:00:00.000Z'),
    })
    await database
      .update(automationSchema.automationLock)
      .set({
        expiresAt: new Date('2026-04-04T10:31:00.000Z'),
        runId: 'run-4',
        startedAt: stolenAt,
      })
      .where(eq(automationSchema.automationLock.key, key))

    await expect(
      renewAutomationLock({
        database,
        key,
        now: new Date('2026-04-04T10:20:00.000Z'),
        runId: 'run-3',
      }),
    ).resolves.toEqual({
      expiresAt: null,
      renewed: false,
    })

    await expect(
      releaseAutomationLock({
        database,
        key,
        runId: 'run-3',
      }),
    ).resolves.toBeUndefined()

    expect(await database.select().from(automationSchema.automationLock)).toEqual([
      {
        expiresAt: new Date('2026-04-04T10:31:00.000Z'),
        key,
        runId: 'run-4',
        startedAt: stolenAt,
      },
    ])
  })

  test('clears transient serialized failures so later lease checks can recover', async () => {
    const key = 'community-sync:org-4'

    await acquireAutomationLock({
      database,
      expiresAt: new Date('2026-04-04T10:15:00.000Z'),
      key,
      runId: 'run-4',
      startedAt: new Date('2026-04-04T10:00:00.000Z'),
    })

    let shouldFailSelect = true
    const flakyDatabase = new Proxy(database, {
      get(target, property, receiver) {
        if (property === 'select') {
          return (...args: Parameters<typeof target.select>) => {
            if (shouldFailSelect) {
              shouldFailSelect = false
              throw new Error('Transient select failure.')
            }

            return target.select(...args)
          }
        }

        const value = Reflect.get(target, property, receiver)

        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    const leaseController = createAutomationLockLeaseController({
      database: flakyDatabase as never,
      key,
      now: () => new Date('2026-04-04T10:05:00.000Z'),
      runId: 'run-4',
    })

    try {
      await expect(leaseController.ensureOwned()).rejects.toThrow('Transient select failure.')
      await expect(leaseController.ensureOwned()).resolves.toBeUndefined()
    } finally {
      await leaseController.stop()
    }
  })
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
              attributes: [
                {
                  trait_type: 'Background',
                  value: 'Forest',
                },
                {
                  trait_type: 'Hat',
                  value: 'Cap',
                },
              ],
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
              attributes: [
                {
                  trait_type: 'Background',
                  value: 'Forest',
                },
                {
                  trait_type: 'Hat',
                  value: 'Crown',
                },
              ],
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
      facetTotals: {
        background: {
          label: 'Background',
          options: {
            desert: {
              label: 'Desert',
              total: 1,
            },
          },
          total: 1,
        },
      },
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
      traits: [
        {
          groupId: 'background',
          groupLabel: 'Background',
          value: 'desert',
          valueLabel: 'Desert',
        },
      ],
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
    expect(await getStoredAssetTraits(assetGroupId)).toEqual([
      {
        address: 'asset-a',
        traitKey: 'background',
        traitLabel: 'Background',
        traitValue: 'forest',
        traitValueLabel: 'Forest',
      },
      {
        address: 'asset-a',
        traitKey: 'hat',
        traitLabel: 'Hat',
        traitValue: 'cap',
        traitValueLabel: 'Cap',
      },
      {
        address: 'asset-b',
        traitKey: 'background',
        traitLabel: 'Background',
        traitValue: 'forest',
        traitValueLabel: 'Forest',
      },
      {
        address: 'asset-b',
        traitKey: 'hat',
        traitLabel: 'Hat',
        traitValue: 'crown',
        traitValueLabel: 'Crown',
      },
    ])
    await expect(getStoredFacetTotals(assetGroupId)).resolves.toEqual({
      background: {
        label: 'Background',
        options: {
          forest: {
            label: 'Forest',
            total: 2,
          },
        },
        total: 2,
      },
      hat: {
        label: 'Hat',
        options: {
          cap: {
            label: 'Cap',
            total: 1,
          },
          crown: {
            label: 'Crown',
            total: 1,
          },
        },
        total: 2,
      },
    })
    await expect(
      listAssetGroupIndexRuns({
        assetGroupId,
        limit: 5,
      }),
    ).resolves.toMatchObject([
      {
        assetGroupId,
        deletedCount: 1,
        errorMessage: null,
        insertedCount: 2,
        pagesProcessed: 2,
        resolverKind: 'helius-collection-assets',
        status: 'succeeded',
        totalCount: 2,
        triggerSource: 'manual',
        updatedCount: 0,
      },
    ])
    await expect(
      getAssetGroupIndexStatusSummaries({
        assetGroupIds: [assetGroupId],
        now: () => new Date('2026-03-31T10:30:00.000Z'),
      }),
    ).resolves.toEqual(
      new Map([
        [
          assetGroupId,
          expect.objectContaining({
            freshnessStatus: 'fresh',
            isRunning: false,
          }),
        ],
      ]),
    )
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
      facetTotals: {
        background: {
          label: 'Background',
          options: {
            desert: {
              label: 'Desert',
              total: 1,
            },
          },
          total: 1,
        },
      },
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
      facetTotals: {
        background: {
          label: 'Background',
          options: {
            desert: {
              label: 'Desert',
              total: 1,
            },
          },
          total: 1,
        },
      },
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
    await expect(getStoredFacetTotals(assetGroupId)).resolves.toEqual({
      background: {
        label: 'Background',
        options: {
          desert: {
            label: 'Desert',
            total: 1,
          },
        },
        total: 1,
      },
    })
  })

  test('rolls back stale cleanup when refreshing facet totals fails', async () => {
    const assetGroupId = crypto.randomUUID()
    const initialIndexedAt = new Date('2026-03-30T12:00:00.000Z')
    const now = new Date('2026-03-31T12:00:00.000Z')

    await insertAssetGroupRecord({
      address: 'collection-cleanup-atomicity',
      facetTotals: {
        background: {
          label: 'Background',
          options: {
            desert: {
              label: 'Desert',
              total: 1,
            },
          },
          total: 1,
        },
      },
      id: assetGroupId,
      type: 'collection',
    })
    await insertAssetRecord({
      address: 'asset-stale',
      amount: '1',
      assetGroupId,
      firstSeenAt: initialIndexedAt,
      indexedAt: initialIndexedAt,
      metadataName: 'Stale',
      owner: 'wallet-stale',
      resolverKind: 'helius-collection-assets',
      traits: [
        {
          groupId: 'background',
          groupLabel: 'Background',
          value: 'desert',
          valueLabel: 'Desert',
        },
      ],
    })

    await expect(
      indexAssetGroup({
        adapter: getCollectionAdapter({
          pageOneItems: [
            {
              content: {
                metadata: {
                  attributes: [
                    {
                      trait_type: 'Background',
                      value: 'Forest',
                    },
                  ],
                  name: 'Alpha',
                },
              },
              id: 'asset-a',
              ownership: {
                owner: 'wallet-a',
              },
            },
          ],
        }).adapter,
        apiKey: 'helius-api-key',
        assetGroup: {
          address: 'collection-cleanup-atomicity',
          id: assetGroupId,
          type: 'collection',
        },
        database: createUpdateFailureDatabase(assetSchema.assetGroup) as never,
        heliusCluster: 'devnet',
        now: () => now,
      }),
    ).rejects.toThrow('Run update failed.')

    await expect(getStoredAssets(assetGroupId)).resolves.toMatchObject([
      {
        address: 'asset-a',
        indexedAt: now,
      },
      {
        address: 'asset-stale',
        indexedAt: initialIndexedAt,
      },
    ])
    await expect(getStoredFacetTotals(assetGroupId)).resolves.toEqual({
      background: {
        label: 'Background',
        options: {
          desert: {
            label: 'Desert',
            total: 1,
          },
        },
        total: 1,
      },
    })
  })

  test('rolls back the page asset rewrite when inserting traits fails', async () => {
    const assetGroupId = crypto.randomUUID()
    const initialIndexedAt = new Date('2026-03-30T09:00:00.000Z')
    const now = new Date('2026-03-31T12:30:00.000Z')

    await insertAssetGroupRecord({
      address: 'collection-atomicity',
      facetTotals: {
        background: {
          label: 'Background',
          options: {
            desert: {
              label: 'Desert',
              total: 1,
            },
          },
          total: 1,
        },
      },
      id: assetGroupId,
      type: 'collection',
    })
    await insertAssetRecord({
      address: 'asset-a',
      amount: '1',
      assetGroupId,
      firstSeenAt: initialIndexedAt,
      indexedAt: initialIndexedAt,
      metadataName: 'Alpha',
      owner: 'wallet-a',
      resolverKind: 'helius-collection-assets',
      traits: [
        {
          groupId: 'background',
          groupLabel: 'Background',
          value: 'desert',
          valueLabel: 'Desert',
        },
      ],
    })

    await expect(
      indexAssetGroup({
        adapter: getCollectionAdapter({
          pageOneItems: [
            {
              content: {
                metadata: {
                  attributes: [
                    {
                      trait_type: 'Background',
                      value: 'Forest',
                    },
                  ],
                  name: 'Alpha Updated',
                },
              },
              id: 'asset-a',
              ownership: {
                owner: 'wallet-a',
              },
            },
          ],
        }).adapter,
        apiKey: 'helius-api-key',
        assetGroup: {
          address: 'collection-atomicity',
          id: assetGroupId,
          type: 'collection',
        },
        database: createInsertFailureDatabase(assetSchema.assetTrait) as never,
        heliusCluster: 'devnet',
        now: () => now,
      }),
    ).rejects.toThrow('Run insert failed.')

    await expect(getStoredAssets(assetGroupId)).resolves.toMatchObject([
      {
        address: 'asset-a',
        indexedAt: initialIndexedAt,
        metadataName: 'Alpha',
      },
    ])
    await expect(getStoredAssetTraits(assetGroupId)).resolves.toEqual([
      {
        address: 'asset-a',
        traitKey: 'background',
        traitLabel: 'Background',
        traitValue: 'desert',
        traitValueLabel: 'Desert',
      },
    ])
    await expect(getStoredFacetTotals(assetGroupId)).resolves.toEqual({
      background: {
        label: 'Background',
        options: {
          desert: {
            label: 'Desert',
            total: 1,
          },
        },
        total: 1,
      },
    })
  })

  test('fails with lock_lost and stops later page writes after another run steals the lease', async () => {
    const assetGroupId = crypto.randomUUID()
    const now = new Date('2026-03-31T12:00:00.000Z')
    const staleTime = new Date('2026-03-30T12:00:00.000Z')
    const adapter = {
      async getAssetsByCollection(args: { collection: string; cursor?: string; limit: number; page: number }) {
        if (args.page === 1) {
          return {
            cursor: 'page-2',
            items: [
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
          }
        }

        await database
          .update(automationSchema.automationLock)
          .set({
            expiresAt: new Date('2026-03-31T12:30:00.000Z'),
            runId: 'stolen-run',
            startedAt: new Date('2026-03-31T12:16:00.000Z'),
          })
          .where(eq(automationSchema.automationLock.key, `asset-group-index:${assetGroupId}`))

        return {
          items: [
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
        }
      },
      async getTokenAccounts() {
        throw new Error('Expected collection indexing.')
      },
    }

    await insertAssetGroupRecord({
      address: 'collection-lock-loss',
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
          address: 'collection-lock-loss',
          id: assetGroupId,
          type: 'collection',
        },
        heliusCluster: 'devnet',
        now: () => now,
      }),
    ).rejects.toThrow('Automation lock lease was lost')

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
    await expect(
      listAssetGroupIndexRuns({
        assetGroupId,
        limit: 5,
      }),
    ).resolves.toMatchObject([
      {
        deletedCount: 0,
        errorPayload: {
          reason: 'lock_lost',
        },
        insertedCount: 1,
        status: 'failed',
        triggerSource: 'manual',
        updatedCount: 0,
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

  test('chunks large page writes so collection indexing stays under SQLite variable limits', async () => {
    const assetGroupId = crypto.randomUUID()
    const now = new Date('2026-03-31T13:30:00.000Z')
    const itemCount = 950
    const { adapter } = getCollectionAdapter({
      pageOneItems: Array.from(
        {
          length: itemCount,
        },
        (_, index) => ({
          content: {
            metadata: {
              name: `Asset ${index + 1}`,
            },
          },
          id: `asset-${index + 1}`,
          ownership: {
            owner: `wallet-${index + 1}`,
          },
        }),
      ),
    })

    await insertAssetGroupRecord({
      address: 'collection-large-page',
      id: assetGroupId,
      type: 'collection',
    })

    const result = await indexAssetGroup({
      adapter,
      apiKey: 'helius-api-key',
      assetGroup: {
        address: 'collection-large-page',
        id: assetGroupId,
        type: 'collection',
      },
      heliusCluster: 'devnet',
      now: () => now,
    })

    expect(result).toMatchObject({
      assetGroupId,
      deleted: 0,
      inserted: itemCount,
      pages: 1,
      resolverKind: 'helius-collection-assets',
      total: itemCount,
      updated: 0,
    })
    await expect(getStoredAssets(assetGroupId)).resolves.toHaveLength(itemCount)
  })

  test('releases the automation lock when the index run insert fails', async () => {
    const assetGroupId = crypto.randomUUID()

    await insertAssetGroupRecord({
      address: 'collection-lock-release',
      id: assetGroupId,
      type: 'collection',
    })

    await expect(
      indexAssetGroup({
        adapter: getCollectionAdapter({
          pageOneItems: [],
        }).adapter,
        apiKey: 'helius-api-key',
        assetGroup: {
          address: 'collection-lock-release',
          id: assetGroupId,
          type: 'collection',
        },
        database: createInsertFailureDatabase(assetSchema.assetGroupIndexRun) as never,
        heliusCluster: 'devnet',
        now: () => new Date('2026-03-31T13:45:00.000Z'),
      }),
    ).rejects.toThrow('Run insert failed.')

    expect(await database.select().from(automationSchema.automationLock)).toHaveLength(0)
  })

  test('keeps the last successful freshness state when a later scheduled run fails', async () => {
    const assetGroupId = crypto.randomUUID()
    const firstRunAt = new Date('2026-03-31T14:00:00.000Z')
    const secondRunAt = new Date('2026-03-31T14:20:00.000Z')

    await insertAssetGroupRecord({
      address: 'collection-failure-history',
      id: assetGroupId,
      type: 'collection',
    })
    await indexAssetGroup({
      adapter: getCollectionAdapter({
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
      }).adapter,
      apiKey: 'helius-api-key',
      assetGroup: {
        address: 'collection-failure-history',
        id: assetGroupId,
        type: 'collection',
      },
      heliusCluster: 'devnet',
      now: () => firstRunAt,
    })

    await expect(
      runScheduledAssetGroupIndex({
        adapter: getCollectionAdapter({
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
          pageTwoError: new Error('Page 2 failed.'),
        }).adapter,
        apiKey: 'helius-api-key',
        assetGroup: {
          address: 'collection-failure-history',
          id: assetGroupId,
          type: 'collection',
        },
        heliusCluster: 'devnet',
        now: () => secondRunAt,
      }),
    ).rejects.toThrow('Page 2 failed.')

    await expect(
      listAssetGroupIndexRuns({
        assetGroupId,
        limit: 5,
      }),
    ).resolves.toMatchObject([
      {
        errorMessage: 'Page 2 failed.',
        status: 'failed',
        triggerSource: 'scheduled',
      },
      {
        errorMessage: null,
        status: 'succeeded',
        triggerSource: 'manual',
      },
    ])
    await expect(
      getAssetGroupIndexStatusSummaries({
        assetGroupIds: [assetGroupId],
        now: () => new Date('2026-03-31T14:30:00.000Z'),
      }),
    ).resolves.toEqual(
      new Map([
        [
          assetGroupId,
          expect.objectContaining({
            freshnessStatus: 'fresh',
            lastRun: expect.objectContaining({
              status: 'failed',
            }),
            lastSuccessfulRun: expect.objectContaining({
              startedAt: firstRunAt,
              status: 'succeeded',
            }),
          }),
        ],
      ]),
    )
  })

  test('uses the last attempt startedAt when selecting due asset groups for scheduling', async () => {
    const dueAssetGroupId = 'asset-group-due'
    const recentAssetGroupId = 'asset-group-recent'
    const runAt = new Date('2026-03-31T15:00:00.000Z')

    await insertAssetGroupRecord({
      address: 'collection-due',
      id: dueAssetGroupId,
      type: 'collection',
    })
    await insertAssetGroupRecord({
      address: 'collection-recent',
      id: recentAssetGroupId,
      type: 'collection',
    })
    await indexAssetGroup({
      adapter: getCollectionAdapter({
        pageOneItems: [],
      }).adapter,
      apiKey: 'helius-api-key',
      assetGroup: {
        address: 'collection-recent',
        id: recentAssetGroupId,
        type: 'collection',
      },
      heliusCluster: 'devnet',
      now: () => runAt,
    })

    await expect(
      listEnabledAssetGroupsDueForScheduledIndexing({
        now: () => new Date('2026-03-31T15:29:00.000Z'),
      }),
    ).resolves.toEqual([
      {
        address: 'collection-due',
        id: dueAssetGroupId,
        type: 'collection',
      },
    ])
    await expect(
      listEnabledAssetGroupsDueForScheduledIndexing({
        now: () => new Date('2026-03-31T16:01:00.000Z'),
      }),
    ).resolves.toEqual([
      {
        address: 'collection-due',
        id: dueAssetGroupId,
        type: 'collection',
      },
      {
        address: 'collection-recent',
        id: recentAssetGroupId,
        type: 'collection',
      },
    ])
  })

  test('chunks large asset-group ID sets when selecting due scheduled indexing', async () => {
    const now = new Date('2026-03-31T09:00:00.000Z')

    await database.insert(assetSchema.assetGroup).values(
      Array.from({ length: 901 }, (_, index) => {
        const suffix = String(index).padStart(4, '0')

        return {
          address: `collection-${suffix}`,
          createdAt: now,
          enabled: true,
          id: `asset-group-${suffix}`,
          indexingStartedAt: null,
          label: `Collection ${suffix}`,
          type: 'collection' as const,
          updatedAt: now,
        }
      }),
    )

    const dueAssetGroups = await listEnabledAssetGroupsDueForScheduledIndexing({
      now: () => new Date('2026-03-31T09:30:00.000Z'),
    })

    expect(dueAssetGroups).toHaveLength(901)
    expect(dueAssetGroups[0]).toMatchObject({
      address: 'collection-0000',
      id: 'asset-group-0000',
    })
    expect(dueAssetGroups.at(-1)).toMatchObject({
      address: 'collection-0900',
      id: 'asset-group-0900',
    })
  })
})
