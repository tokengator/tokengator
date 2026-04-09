import { configureSync, resetSync, type LogRecord } from '@logtape/logtape'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

type RunScheduledCommunityRoleDiscordSyncResult = Awaited<
  ReturnType<(typeof import('../src/features/community-role-sync'))['runScheduledCommunityRoleDiscordSync']>
>
type RunScheduledCommunityRoleSyncResult = Awaited<
  ReturnType<(typeof import('../src/features/community-role-sync'))['runScheduledCommunityRoleSync']>
>

let callOrder: string[] = []
let discordOrganizationsDue: string[] = []
let membershipOrganizationsDue: string[] = []
let scheduledJobs: typeof import('../src/scheduled-jobs')
let assetGroupsDue: Array<{ address: string; id: string; type: 'collection' | 'mint' }> = []
let logRecords: LogRecord[] = []
let assetGroupRunResults = new Map<
  string,
  null | {
    assetGroupId: string
    deleted: number
    inserted: number
    pages: number
    resolverKind: 'helius-collection-assets' | 'helius-token-accounts'
    startedAt: Date
    total: number
    updated: number
  }
>()

const communityDiscordResults = new Map<string, RunScheduledCommunityRoleDiscordSyncResult>()
const communityMembershipResults = new Map<string, RunScheduledCommunityRoleSyncResult>()

function configureTestLogging(onRecord?: (record: LogRecord) => void) {
  logRecords = []
  resetSync()
  configureSync({
    loggers: [
      {
        category: ['logtape'],
        lowestLevel: 'error',
        sinks: ['buffer'],
      },
      {
        category: ['tokengator'],
        lowestLevel: 'info',
        sinks: ['buffer'],
      },
    ],
    sinks: {
      buffer(record) {
        logRecords.push(record)
        onRecord?.(record)
      },
    },
  })
}

beforeAll(async () => {
  process.env.BETTER_AUTH_SECRET = '12345678901234567890123456789012'
  process.env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED = 'true'
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000'
  process.env.CORS_ORIGINS = 'http://127.0.0.1:3001'
  process.env.DATABASE_AUTH_TOKEN = 'test-token'
  process.env.DATABASE_URL = 'file:///tmp/tokengator-scheduled-jobs.sqlite'
  process.env.DISCORD_BOT_TOKEN = 'discord-bot-token'
  process.env.DISCORD_CLIENT_ID = 'discord-client-id'
  process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  process.env.HELIUS_API_KEY = 'helius-api-key'
  process.env.HELIUS_CLUSTER = 'devnet'
  process.env.NODE_ENV = 'test'
  process.env.SCHEDULED_DISCORD_SYNC_INTERVAL_MINUTES = '1'
  process.env.SCHEDULED_INDEX_INTERVAL_MINUTES = '30'
  process.env.SCHEDULED_MEMBERSHIP_SYNC_INTERVAL_MINUTES = '5'
  process.env.SCHEDULER_POLL_SECONDS = '60'
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'

  scheduledJobs = await import('../src/scheduled-jobs')
})

beforeEach(() => {
  assetGroupsDue = []
  assetGroupRunResults = new Map()
  callOrder = []
  communityDiscordResults.clear()
  communityMembershipResults.clear()
  discordOrganizationsDue = []
  membershipOrganizationsDue = []
  configureTestLogging()
})

afterEach(() => {
  resetSync()
})

describe('runScheduledJobsPass', () => {
  test('runs indexing before membership before Discord and forwards membership failures into Discord skips', async () => {
    assetGroupsDue = [
      {
        address: 'collection-a',
        id: 'asset-group-a',
        type: 'collection',
      },
    ]
    assetGroupRunResults.set('asset-group-a', {
      assetGroupId: 'asset-group-a',
      deleted: 0,
      inserted: 0,
      pages: 1,
      resolverKind: 'helius-collection-assets',
      startedAt: new Date('2026-04-01T00:00:00.000Z'),
      total: 0,
      updated: 0,
    })
    membershipOrganizationsDue = ['org-a', 'org-b']
    communityMembershipResults.set('org-a', {
      errorMessage: 'Membership failed.',
      organizationId: 'org-a',
      status: 'failed',
    })
    communityMembershipResults.set('org-b', {
      organizationId: 'org-b',
      status: 'succeeded',
    })
    discordOrganizationsDue = ['org-a', 'org-b']
    communityDiscordResults.set('org-a', {
      organizationId: 'org-a',
      status: 'skipped',
    })
    communityDiscordResults.set('org-b', {
      organizationId: 'org-b',
      status: 'partial',
    })

    const result = await scheduledJobs.runScheduledJobsPass({
      dependencies: {
        listEnabledAssetGroupsDueForScheduledIndexing: async () => assetGroupsDue,
        listOrganizationsDueForScheduledCommunityDiscordSync: async () => discordOrganizationsDue,
        listOrganizationsDueForScheduledCommunityMembershipSync: async () => membershipOrganizationsDue,
        runScheduledAssetGroupIndex: async (input: { assetGroup: { id: string } }) => {
          callOrder.push(`index:${input.assetGroup.id}`)
          const currentResult = assetGroupRunResults.get(input.assetGroup.id)

          if (currentResult === undefined) {
            throw new Error(`Missing asset group result for ${input.assetGroup.id}.`)
          }

          return currentResult
        },
        runScheduledCommunityRoleDiscordSync: async (input: {
          organizationId: string
          skipReason?: 'membership_run_failed'
        }) => {
          callOrder.push(`discord:${input.organizationId}:${input.skipReason ?? 'none'}`)

          return (
            communityDiscordResults.get(input.organizationId) ?? {
              organizationId: input.organizationId,
              status: 'succeeded',
            }
          )
        },
        runScheduledCommunityRoleSync: async (input: { organizationId: string }) => {
          callOrder.push(`membership:${input.organizationId}`)

          return (
            communityMembershipResults.get(input.organizationId) ?? {
              organizationId: input.organizationId,
              status: 'succeeded',
            }
          )
        },
      },
      now: () => new Date('2026-04-01T00:00:00.000Z'),
    })

    expect(callOrder).toEqual([
      'index:asset-group-a',
      'membership:org-a',
      'membership:org-b',
      'discord:org-a:membership_run_failed',
      'discord:org-b:none',
    ])
    expect(result.assetGroupResults).toEqual([
      {
        assetGroupId: 'asset-group-a',
        status: 'succeeded',
      },
    ])
    expect(result.communityMembershipResults).toEqual([
      {
        errorMessage: 'Membership failed.',
        organizationId: 'org-a',
        status: 'failed',
      },
      {
        organizationId: 'org-b',
        status: 'succeeded',
      },
    ])
    expect(result.communityDiscordResults).toEqual([
      {
        organizationId: 'org-a',
        status: 'skipped',
      },
      {
        organizationId: 'org-b',
        status: 'partial',
      },
    ])
  })

  test('logs scheduled sync failure messages with error context', async () => {
    membershipOrganizationsDue = ['org-membership']
    communityMembershipResults.set('org-membership', {
      errorMessage: 'Membership blew up.',
      organizationId: 'org-membership',
      status: 'failed',
    })
    discordOrganizationsDue = ['org-discord']
    communityDiscordResults.set('org-discord', {
      errorMessage: 'Discord blew up.',
      organizationId: 'org-discord',
      status: 'failed',
    })

    await scheduledJobs.runScheduledJobsPass({
      dependencies: {
        listEnabledAssetGroupsDueForScheduledIndexing: async () => [],
        listOrganizationsDueForScheduledCommunityDiscordSync: async () => discordOrganizationsDue,
        listOrganizationsDueForScheduledCommunityMembershipSync: async () => membershipOrganizationsDue,
        runScheduledAssetGroupIndex: async () => {
          throw new Error('Unexpected asset-group execution.')
        },
        runScheduledCommunityRoleDiscordSync: async (input: {
          organizationId: string
          skipReason?: 'membership_run_failed'
        }) => {
          callOrder.push(`discord:${input.organizationId}:${input.skipReason ?? 'none'}`)

          return (
            communityDiscordResults.get(input.organizationId) ?? {
              organizationId: input.organizationId,
              status: 'succeeded',
            }
          )
        },
        runScheduledCommunityRoleSync: async (input: { organizationId: string }) => {
          callOrder.push(`membership:${input.organizationId}`)

          return (
            communityMembershipResults.get(input.organizationId) ?? {
              organizationId: input.organizationId,
              status: 'succeeded',
            }
          )
        },
      },
      now: () => new Date('2026-04-01T00:00:00.000Z'),
    })

    expect(logRecords.filter((record) => record.level === 'error').map((record) => record.message.join(''))).toEqual([
      '[scheduled-jobs:membership] organizationId=org-membership failed error=Membership blew up.',
      '[scheduled-jobs:discord] organizationId=org-discord failed error=Discord blew up.',
    ])
  })
})

describe('runScheduledJobsLoop', () => {
  test('stops gracefully when the shutdown signal is triggered', async () => {
    const controller = new AbortController()
    let passCount = 0

    configureTestLogging((record) => {
      if (record.level !== 'info') {
        return
      }

      if (record.message.join('').startsWith('[scheduled-jobs] completed')) {
        controller.abort()
      }
    })

    await scheduledJobs.runScheduledJobsLoop({
      dependencies: {
        listEnabledAssetGroupsDueForScheduledIndexing: async () => {
          passCount += 1

          return []
        },
        listOrganizationsDueForScheduledCommunityDiscordSync: async () => [],
        listOrganizationsDueForScheduledCommunityMembershipSync: async () => [],
        runScheduledAssetGroupIndex: async () => {
          throw new Error('Unexpected asset-group execution.')
        },
        runScheduledCommunityRoleDiscordSync: async () => {
          throw new Error('Unexpected Discord execution.')
        },
        runScheduledCommunityRoleSync: async () => {
          throw new Error('Unexpected membership execution.')
        },
      },
      signal: controller.signal,
    })

    expect(passCount).toBe(1)
    expect(logRecords.filter((record) => record.level === 'info').map((record) => record.message.join(''))).toEqual([
      '[scheduled-jobs] completed assetGroups=0 membership=0 discord=0',
      '[scheduled-jobs] stopping',
    ])
  })
})
