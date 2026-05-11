import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
// @ts-expect-error jsdom is installed for tests but does not expose declarations in this workspace.
import { JSDOM } from 'jsdom'
import { renderToStaticMarkup } from 'react-dom/server'
import type {
  AdminCommunityRoleDiscordGuildRolesResult,
  AdminCommunityRoleListRunsResult,
  AdminCommunityRoleSyncStatusResult,
  CommunityDiscordAnnouncementCatalog,
  AdminOrganizationDetailEntity,
} from '@tokengator/sdk'

const organization = {
  createdAt: new Date('2026-04-02T12:00:00.000Z'),
  description: null,
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
      'https://discord.com/oauth2/authorize?client_id=discord-client-id&disable_guild_select=true&guild_id=123456789012345678&permissions=268438528&scope=applications.commands+bot',
    lastCheckedAt: new Date('2026-04-02T12:05:00.000Z'),
    roleSyncEnabled: false,
    status: 'connected' as const,
  },
  discordUrl: null,
  githubUrl: null,
  id: 'org-1',
  logo: null,
  memberCount: 0,
  members: [],
  metadata: null,
  name: 'Acme',
  owners: [],
  slug: 'acme',
  telegramUrl: null,
  websiteUrl: null,
  xUrl: null,
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

const discordAnnouncementCatalogResult = {
  channels: [
    {
      id: '223456789012345678',
      name: 'admin-role-updates',
      type: 'text' as const,
    },
  ],
  configs: [
    {
      channelId: '223456789012345678',
      channelName: 'admin-role-updates',
      checks: [],
      description: 'Post a message when Discord reconcile grants or revokes roles for a user.',
      enabled: false,
      label: 'Role Updates',
      status: 'ready' as const,
      type: 'role_updates' as const,
    },
  ],
  connection: {
    diagnostics: {
      checks: [],
      guild: {
        id: '123456789012345678',
        name: 'Acme Guild',
      },
      permissions: {
        administrator: false,
      },
    },
    guildId: '123456789012345678',
    guildName: 'Acme Guild',
    lastCheckedAt: new Date('2026-04-02T12:10:00.000Z'),
    status: 'connected' as const,
  },
} satisfies CommunityDiscordAnnouncementCatalog

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

const domGlobalKeys = [
  'Element',
  'Event',
  'HTMLElement',
  'MutationObserver',
  'Node',
  'SVGElement',
  'document',
  'getComputedStyle',
  'navigator',
  'window',
] as const

let domGlobalDescriptors: Array<[(typeof domGlobalKeys)[number], PropertyDescriptor | undefined]> = []
let domWindow: Window | null = null

function ensureDom() {
  if (typeof document !== 'undefined') {
    return
  }

  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  domGlobalDescriptors = domGlobalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  domWindow = dom.window as unknown as Window

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: dom.window.document,
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: dom.window,
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  })
  Object.defineProperty(globalThis, 'Element', {
    configurable: true,
    value: dom.window.Element,
  })
  Object.defineProperty(globalThis, 'Event', {
    configurable: true,
    value: dom.window.Event,
  })
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: dom.window.HTMLElement,
  })
  Object.defineProperty(globalThis, 'MutationObserver', {
    configurable: true,
    value: dom.window.MutationObserver,
  })
  Object.defineProperty(globalThis, 'Node', {
    configurable: true,
    value: dom.window.Node,
  })
  Object.defineProperty(globalThis, 'SVGElement', {
    configurable: true,
    value: dom.window.SVGElement,
  })
  Object.defineProperty(globalThis, 'getComputedStyle', {
    configurable: true,
    value: dom.window.getComputedStyle.bind(dom.window),
  })
}

function restoreDom() {
  for (const [key, descriptor] of domGlobalDescriptors) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor)
    } else {
      Reflect.deleteProperty(globalThis, key)
    }
  }

  domWindow?.close()
  domWindow = null
  domGlobalDescriptors = []
}

let AdminCommunityFeatureDiscordEntry: typeof import('../src/features/admin-community/feature/admin-community-feature-discord-entry').AdminCommunityFeatureDiscordEntry

beforeAll(async () => {
  ensureDom()

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

  mock.module(
    '../src/features/admin-community/data-access/use-admin-community-discord-announcement-catalog-query',
    () => ({
      useAdminCommunityDiscordAnnouncementCatalogQuery: () => ({
        data: discordAnnouncementCatalogResult,
        error: null,
        isPending: false,
      }),
    }),
  )

  mock.module(
    '../src/features/admin-community/data-access/use-admin-community-discord-announcement-config-upsert',
    () => ({
      useAdminCommunityDiscordAnnouncementConfigUpsert: () => ({
        isPending: false,
        mutateAsync: async () => {},
        variables: undefined,
      }),
    }),
  )

  mock.module(
    '../src/features/admin-community/data-access/use-admin-community-discord-announcement-channel-test',
    () => ({
      useAdminCommunityDiscordAnnouncementChannelTest: () => ({
        isPending: false,
        mutate: () => {},
        variables: undefined,
      }),
    }),
  )

  mock.module(
    '../src/features/admin-community/data-access/use-admin-community-discord-announcement-enabled-set',
    () => ({
      useAdminCommunityDiscordAnnouncementEnabledSet: () => ({
        isPending: false,
        mutate: () => {},
        variables: undefined,
      }),
    }),
  )

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
  restoreDom()
})

afterEach(() => {
  cleanup()
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
    expect(markup).toContain('Discord Announcements')
    expect(markup).toContain('Role Updates')
    expect(markup).toContain('Current channel: admin-role-updates')
    expect(markup).toContain('Test Channel')
    expect(markup).toContain('Update Channel')
    expect(markup).toContain('Discord role writes are paused while sync is disabled.')
    expect(markup).toContain('paused')
    expect(markup).toContain('disabled')
  })

  test('shows the selected channel label in the channel trigger instead of the raw id', () => {
    const view = render(<AdminCommunityFeatureDiscordEntry initialOrganization={organization} />)
    const channelTrigger = view.getByLabelText('Change channel')

    expect(channelTrigger.textContent).toContain('#admin-role-updates · text')
    expect(channelTrigger.textContent).not.toContain('223456789012345678')
  })
})
