import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

let CommunitiesRoute: typeof import('../src/routes/communities/route').Route

interface TestAppAuthState {
  authenticatedHomePath: '/onboard' | '/profile'
  identities: null
  isOnboardingComplete: boolean
  onboardingStatus: null
  profileSettings: null
  session: {
    user: {
      id: string
      image: string | null
      name: string
      role: 'admin' | 'user'
      username: string | null
    }
  } | null
  solanaWallets: null
}

function createAppAuthState(overrides?: Partial<TestAppAuthState>): TestAppAuthState {
  return {
    authenticatedHomePath: '/profile',
    identities: null,
    isOnboardingComplete: true,
    onboardingStatus: null,
    profileSettings: null,
    session: {
      user: {
        id: 'user-1',
        image: null,
        name: 'Alice',
        role: 'user',
        username: 'alice',
      },
    },
    solanaWallets: null,
    ...overrides,
  }
}

beforeAll(async () => {
  mock.module('../src/features/auth/data-access/get-app-auth-state', () => ({
    getAppAuthStateQueryOptions: () => ({}),
  }))

  ;({ Route: CommunitiesRoute } = await import('../src/routes/communities/route'))
})

afterAll(() => {
  mock.restore()
})

describe('community routes', () => {
  test('redirects /communities to login without a session', async () => {
    try {
      await CommunitiesRoute.options.beforeLoad?.({
        context: {
          queryClient: {
            ensureQueryData: async () => createAppAuthState({ session: null }),
          },
        },
      } as never)
    } catch (error) {
      expect(error).toMatchObject({
        options: {
          to: '/login',
        },
      })

      return
    }

    throw new Error('Expected the route to redirect.')
  })

  test('allows onboarded users to access /communities children', async () => {
    const appAuthState = createAppAuthState()
    const { session } = appAuthState

    if (!session) {
      throw new Error('Expected an authenticated session.')
    }

    await expect(
      CommunitiesRoute.options.beforeLoad?.({
        context: {
          queryClient: {
            ensureQueryData: async () => appAuthState,
          },
        },
      } as never),
    ).resolves.toEqual({ session })
  })

  test('redirects unonboarded non-admin users from /communities to onboard', async () => {
    try {
      await CommunitiesRoute.options.beforeLoad?.({
        context: {
          queryClient: {
            ensureQueryData: async () => createAppAuthState({ isOnboardingComplete: false }),
          },
        },
      } as never)
    } catch (error) {
      expect(error).toMatchObject({
        options: {
          to: '/onboard',
        },
      })

      return
    }

    throw new Error('Expected the route to redirect.')
  })

  test('redirects unonboarded admins from /communities to admin', async () => {
    try {
      await CommunitiesRoute.options.beforeLoad?.({
        context: {
          queryClient: {
            ensureQueryData: async () =>
              createAppAuthState({
                isOnboardingComplete: false,
                session: {
                  user: {
                    id: 'user-1',
                    image: null,
                    name: 'Alice',
                    role: 'admin',
                    username: 'alice',
                  },
                },
              }),
          },
        },
      } as never)
    } catch (error) {
      expect(error).toMatchObject({
        options: {
          to: '/admin',
        },
      })

      return
    }

    throw new Error('Expected the route to redirect.')
  })
})
