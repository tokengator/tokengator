import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type {
  AdminCommunityRoleDiscordGuildRolesResult,
  AdminCommunityRoleListRunsResult,
  AdminCommunityRoleSyncStatusResult,
  AdminOrganizationDetailEntity,
} from '@tokengator/sdk'

const organization = {
  createdAt: new Date('2026-04-02T12:00:00.000Z'),
  discordConnection: {
    diagnostics: {
      checks: [],
      commands: {
        errorMessage: null,
        registered: true,
      },
      guild: {
        id: '123456789012345678',
        name: 'Acme Guild',
      },
      permissions: {
        administrator: false,
        manageRoles: true,
      },
    },
    guildId: '123456789012345678',
    guildName: 'Acme Guild',
    inviteUrl:
      'https://discord.com/oauth2/authorize?client_id=discord-client-id&disable_guild_select=true&guild_id=123456789012345678&permissions=268435456&scope=applications.commands+bot',
    lastCheckedAt: new Date('2026-04-02T12:05:00.000Z'),
    roleSyncEnabled: false,
    status: 'connected' as const,
  },
  id: 'org-1',
  logo: null,
  memberCount: 0,
  members: [],
  metadata: null,
  name: 'Acme',
  owners: [],
  slug: 'acme',
} satisfies AdminOrganizationDetailEntity

const discordGuildRolesResult = {
  connection: {
    diagnostics: {
      botHighestRole: {
        id: 'bot-role-id',
        name: 'TokenGator',
        position: 10,
      },
      checks: [],
      guild: {
        id: '123456789012345678',
        name: 'Acme Guild',
      },
      permissions: {
        administrator: false,
        manageRoles: true,
      },
    },
    guildId: '123456789012345678',
    guildName: 'Acme Guild',
    lastCheckedAt: new Date('2026-04-02T12:10:00.000Z'),
    status: 'connected' as const,
  },
  guildRoles: [],
} satisfies AdminCommunityRoleDiscordGuildRolesResult

const discordRunsResult = {
  kind: 'discord' as const,
  runs: [],
} satisfies AdminCommunityRoleListRunsResult

const syncStatusResult = {
  dependencyAssetGroups: [],
  discordStatus: {
    freshnessStatus: 'stale' as const,
    isRunning: false,
    lastRun: null,
    lastSuccessfulRun: null,
    roleSyncEnabled: false,
    staleAfterMinutes: 1,
  },
  membershipStatus: {
    freshnessStatus: 'unknown' as const,
    isRunning: false,
    lastRun: null,
    lastSuccessfulRun: null,
    staleAfterMinutes: 1,
  },
  organizationId: 'org-1',
} satisfies AdminCommunityRoleSyncStatusResult

let AdminCommunityFeatureDiscordEntry: typeof import('../src/features/admin-community/feature/admin-community-feature-discord-entry').AdminCommunityFeatureDiscordEntry

beforeAll(async () => {
  mock.module('../src/features/admin-community/data-access/use-admin-community-get-query', () => ({
    useAdminCommunityGetQuery: () => ({
      data: organization,
    }),
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-discord-connection-delete', () => ({
    useAdminCommunityDiscordConnectionDelete: () => ({
      isPending: false,
      mutateAsync: async () => {},
    }),
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-discord-connection-refresh', () => ({
    useAdminCommunityDiscordConnectionRefresh: () => ({
      isPending: false,
      mutate: () => {},
    }),
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-discord-connection-upsert', () => ({
    useAdminCommunityDiscordConnectionUpsert: () => ({
      isPending: false,
      mutateAsync: async () => {},
    }),
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-discord-role-sync-enabled-set', () => ({
    useAdminCommunityDiscordRoleSyncEnabledSet: () => ({
      isPending: false,
      mutate: () => {},
    }),
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-discord-sync-apply', () => ({
    useAdminCommunityDiscordSyncApply: () => ({
      isPending: false,
      mutateAsync: async () => {
        throw new Error('Apply should not run in the SSR test.')
      },
    }),
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-discord-sync-preview', () => ({
    useAdminCommunityDiscordSyncPreview: () => ({
      isPending: false,
      mutateAsync: async () => {
        throw new Error('Preview should not run in the SSR test.')
      },
    }),
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-discord-guild-roles-query', () => ({
    useAdminCommunityDiscordGuildRolesQuery: () => ({
      data: discordGuildRolesResult,
      error: null,
      isPending: false,
    }),
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-discord-runs-query', () => ({
    useAdminCommunityDiscordRunsQuery: () => ({
      data: discordRunsResult,
      error: null,
      isPending: false,
    }),
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-sync-status-query', () => ({
    useAdminCommunitySyncStatusQuery: () => ({
      data: syncStatusResult,
      error: null,
      isPending: false,
    }),
  }))

  ;({ AdminCommunityFeatureDiscordEntry } =
    await import('../src/features/admin-community/feature/admin-community-feature-discord-entry'))
})

afterAll(() => {
  mock.restore()
})

describe('AdminCommunityFeatureDiscordEntry', () => {
  test('renders paused Discord sync controls while keeping preview available', () => {
    const markup = renderToStaticMarkup(<AdminCommunityFeatureDiscordEntry initialOrganization={organization} />)

    expect(markup).toContain('id="community-discord-role-sync-enabled"')
    expect(markup).toContain('aria-checked="false"')
    expect(markup).toContain('Preview Discord Roles')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>.*Apply Discord Reconcile/s)
    expect(markup).toContain(
      'Discord role sync is disabled. Use preview to compare outcomes safely before re-enabling apply.',
    )
    expect(markup).toContain('Discord role writes are paused while sync is disabled.')
    expect(markup).toContain('paused')
    expect(markup).toContain('disabled')
  })
})
