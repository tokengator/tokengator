import { describe, expect, test } from 'bun:test'

import { canAccessProfileSettings, getProfileIndexRedirect } from '../src/features/profile/util/profile-route-access'
import { Route as ProfileUsernameIndexRoute } from '../src/routes/profile/$username/index'

describe('profile route helpers', () => {
  test('redirects /profile to the signed-in username route', () => {
    expect(
      getProfileIndexRedirect({
        user: {
          id: 'user-1',
          name: 'Alice',
          username: 'alice',
        },
      }),
    ).toEqual({
      params: {
        username: 'alice',
      },
      to: '/profile/$username',
    })
  })

  test('redirects /profile to onboard when the session has no username', () => {
    expect(
      getProfileIndexRedirect({
        user: {
          id: 'user-1',
          name: 'Alice',
          username: null,
        },
      }),
    ).toEqual({
      to: '/onboard',
    })
  })

  test('allows only the owner to access username settings routes', () => {
    expect(
      canAccessProfileSettings({
        session: {
          user: {
            id: 'user-1',
            name: 'Alice',
            username: 'alice',
          },
        },
        username: 'alice',
      }),
    ).toBe(true)
    expect(
      canAccessProfileSettings({
        session: {
          user: {
            id: 'user-2',
            name: 'Bob',
            username: 'bob',
          },
        },
        username: 'alice',
      }),
    ).toBe(false)
  })

  test('redirects the username index route to the identities tab', async () => {
    try {
      await ProfileUsernameIndexRoute.options.beforeLoad?.({
        params: {
          username: 'alice',
        },
      } as never)
    } catch (error) {
      expect(error).toMatchObject({
        options: {
          params: {
            username: 'alice',
          },
          to: '/profile/$username/identities',
        },
      })

      return
    }

    throw new Error('Expected the route to redirect.')
  })
})
