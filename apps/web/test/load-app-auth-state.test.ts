import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

let loadAppAuthState: typeof import('../src/features/auth/data-access/load-app-auth-state').loadAppAuthState

beforeAll(async () => {
  mock.module('@/lib/orpc-server', () => ({
    serverOrpcClient: {
      profile: {
        getSettings: async () => ({
          settings: {
            developerMode: false,
            private: false,
          },
        }),
        listIdentities: async () => ({
          identities: [],
        }),
        listSolanaWallets: async () => ({
          solanaWallets: [],
        }),
      },
    },
  }))

  ;({ loadAppAuthState } = await import('../src/features/auth/data-access/load-app-auth-state'))
})

afterAll(() => {
  mock.restore()
})

describe('loadAppAuthState', () => {
  test('preserves the Better Auth image field when normalizing the app session', async () => {
    const session = {
      session: {
        createdAt: new Date('2026-04-11T00:00:00.000Z'),
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        id: 'session-1',
        token: 'session-token',
        updatedAt: new Date('2026-04-11T00:00:00.000Z'),
        userId: 'user-1',
      },
      user: {
        email: 'alice@example.com',
        emailVerified: true,
        id: 'user-1',
        image: 'https://example.com/avatar.png',
        name: 'Alice',
        role: 'user',
        username: 'alice',
      },
    } satisfies NonNullable<Parameters<typeof loadAppAuthState>[0]['session']>

    const result = await loadAppAuthState({
      session,
    })

    expect(result.session).toEqual({
      user: {
        id: 'user-1',
        image: 'https://example.com/avatar.png',
        name: 'Alice',
        role: 'user',
        username: 'alice',
      },
    })
  })
})
