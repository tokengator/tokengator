import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let DevFeatureBackup: typeof import('../src/features/dev/feature/dev-feature-backup').DevFeatureBackup

const applyMutationState = {
  data: null as Record<string, unknown> | null,
  error: null as Error | null,
  isPending: false,
  mutate: () => undefined,
}
const previewMutationState = {
  data: null as Record<string, unknown> | null,
  error: null as Error | null,
  isPending: false,
  mutate: () => undefined,
}

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
    useLocation: () => ({
      pathname: '/dev/backup',
    }),
    useNavigate: () => async () => undefined,
  }))
  mock.module('../src/features/dev/data-access/use-dev-pubkey-link-import-apply', () => ({
    useDevPubkeyLinkImportApply: () => applyMutationState,
  }))
  mock.module('../src/features/dev/data-access/use-dev-pubkey-link-import-preview', () => ({
    useDevPubkeyLinkImportPreview: () => previewMutationState,
  }))

  ;({ DevFeatureBackup } = await import('../src/features/dev/feature/dev-feature-backup'))
})

afterAll(() => {
  mock.restore()
})

beforeEach(() => {
  applyMutationState.data = null
  applyMutationState.error = null
  applyMutationState.isPending = false
  previewMutationState.data = null
  previewMutationState.error = null
  previewMutationState.isPending = false
})

describe('DevFeatureBackup', () => {
  test('renders the preview result with skipped users and username rewrites', () => {
    previewMutationState.data = {
      backup: {
        backupName: 'sample.backup.json',
        fetchedAt: '2026-04-20T12:00:00.000Z',
        sourceUrl: 'https://example.com/pubkey-link.backup.json',
        sourceUsersCount: 5,
        timestamp: '2026-04-20T09:32:25.934Z',
      },
      kind: 'preview',
      summary: {
        createDiscordAccountCount: 3,
        createIdentityCount: 6,
        createSolanaWalletCount: 3,
        createUserCount: 2,
        mergeUserCount: 1,
        skipConflictCount: 1,
        skipEmailConflictCount: 0,
        skipMissingDiscordCount: 1,
        skipUserCount: 2,
        totalUserCount: 5,
        unchangedUserCount: 0,
        usernameRewriteCount: 1,
      },
      usernameRewrites: [
        {
          backupUserId: 'backup-takenname',
          finalUsername: 'takenname_456789',
          originalUsername: 'takenname',
          reason: 'collision',
        },
      ],
      users: [
        {
          action: 'skip',
          existingUser: null,
          matches: [
            {
              id: 'user-conflict-a',
              kinds: ['discord'],
              username: 'conflict.a',
            },
            {
              id: 'user-conflict-b',
              kinds: ['solana'],
              username: 'conflict.b',
            },
          ],
          operations: {
            createDiscordAccountCount: 0,
            createDiscordAccountIds: [],
            createIdentityCount: 0,
            createSolanaWalletAddresses: [],
            createSolanaWalletCount: 0,
            createUser: false,
          },
          skipReason: 'conflict',
          source: {
            avatarUrl: 'https://cdn.discordapp.com/avatars/222222222222222222/avatar.png?size=512',
            backupUserId: 'backup-delta',
            createdAt: '2025-04-01T00:00:00.000Z',
            discordAccountIds: ['222222222222222222'],
            name: 'Delta',
            solanaAddresses: ['DeltaWallet111111111111111111111111111111111'],
            updatedAt: '2025-04-01T00:00:00.000Z',
            username: 'delta',
          },
          usernameRewrite: null,
        },
      ],
    }

    const markup = renderToStaticMarkup(<DevFeatureBackup />)

    expect(markup).toContain('Preview ready')
    expect(markup).toContain('sample.backup.json')
    expect(markup).toContain('Skipped and Conflicts')
    expect(markup).toContain('conflict.a (discord)')
    expect(markup).toContain('conflict.b (solana)')
    expect(markup).toContain('Username Rewrites')
    expect(markup).toContain('takenname_456789')
  })

  test('renders the apply summary state', () => {
    applyMutationState.data = {
      appliedAt: '2026-04-20T12:00:00.000Z',
      appliedSummary: {
        appliedUserCount: 3,
        createDiscordAccountCount: 3,
        createIdentityCount: 6,
        createSolanaWalletCount: 3,
        createUserCount: 2,
      },
      backup: {
        backupName: 'sample.backup.json',
        fetchedAt: '2026-04-20T12:00:00.000Z',
        sourceUrl: 'https://example.com/pubkey-link.backup.json',
        sourceUsersCount: 5,
        timestamp: '2026-04-20T09:32:25.934Z',
      },
      kind: 'apply',
      summary: {
        createDiscordAccountCount: 3,
        createIdentityCount: 6,
        createSolanaWalletCount: 3,
        createUserCount: 2,
        mergeUserCount: 1,
        skipConflictCount: 1,
        skipEmailConflictCount: 0,
        skipMissingDiscordCount: 1,
        skipUserCount: 2,
        totalUserCount: 5,
        unchangedUserCount: 0,
        usernameRewriteCount: 1,
      },
      usernameRewrites: [],
      users: [],
    }

    const markup = renderToStaticMarkup(<DevFeatureBackup />)

    expect(markup).toContain('Apply completed with skips')
    expect(markup).toContain('Applied changes')
    expect(markup).toContain('3 users touched')
    expect(markup).toContain('Apply Import')
  })
})
