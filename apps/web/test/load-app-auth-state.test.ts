import { describe, expect, test } from 'bun:test'

describe('loadAppAuthState', () => {
  test('preserves the Better Auth image field when normalizing the app session', async () => {
    const previousApiUrl = process.env.API_URL

    process.env.API_URL = 'http://localhost:3000'

    try {
      const { loadAppAuthState } = await import('../src/features/auth/data-access/load-app-auth-state')
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
        profileClient: {
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
        } as Parameters<typeof loadAppAuthState>[0]['profileClient'],
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
    } finally {
      process.env.API_URL = previousApiUrl
    }
  })
})
