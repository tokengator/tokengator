import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterContextProvider,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
// @ts-expect-error jsdom is installed for tests but does not expose declarations in this workspace.
import { JSDOM } from 'jsdom'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { normalizeCliAuthUserCode, validateCliAuthorizeSearch } from '../src/features/cli-auth/util/cli-auth-user-code'

interface CliAuthUserCodeVerification {
  error: string | null
  state: 'invalid' | 'ready'
}

const domGlobalKeys = [
  'Element',
  'Event',
  'HTMLElement',
  'MouseEvent',
  'MutationObserver',
  'Node',
  'SVGElement',
  'document',
  'getComputedStyle',
  'navigator',
  'window',
] as const

let CliAuthFeatureAuthorize: typeof import('../src/features/cli-auth/feature/cli-auth-feature-authorize').CliAuthFeatureAuthorize
let CliAuthorizeRoute: typeof import('../src/routes/cli/authorize').Route
let domGlobalDescriptors: Array<[(typeof domGlobalKeys)[number], PropertyDescriptor | undefined]> = []
let domWindow: Window | null = null
let userCodeVerificationResult: CliAuthUserCodeVerification = {
  error: null,
  state: 'ready',
}
const verifyCliAuthUserCodeCalls: string[] = []

function createSession() {
  return {
    user: {
      id: 'user-1',
      image: null,
      name: 'Alice',
      role: 'user',
      username: 'alice',
    },
  } as const
}

function createAuthClient() {
  const calls = {
    approve: [] as Array<{ userCode: string }>,
    deny: [] as Array<{ userCode: string }>,
    verify: [] as Array<{ query: { user_code: string } }>,
  }
  const device = Object.assign(
    async (args: { query: { user_code: string } }) => {
      calls.verify.push(args)

      return {
        data: {
          status: 'pending',
          user_code: args.query.user_code,
        },
        error: null,
      }
    },
    {
      approve: async (args: { userCode: string }) => {
        calls.approve.push(args)

        return {
          data: {
            success: true,
          },
          error: null,
        }
      },
      deny: async (args: { userCode: string }) => {
        calls.deny.push(args)

        return {
          data: {
            success: true,
          },
          error: null,
        }
      },
    },
  )

  return {
    calls,
    client: {
      device,
    },
  }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  })
}

function createTestRouter() {
  const rootRoute = createRootRoute()
  const cliAuthorizeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cli/authorize',
  })
  const routeTree = rootRoute.addChildren([cliAuthorizeRoute])

  return createRouter({
    history: createMemoryHistory({
      initialEntries: ['/cli/authorize?user_code=ABCD1234'],
    }),
    isServer: true,
    routeTree,
  })
}

function ensureDom() {
  if (typeof document !== 'undefined') {
    return
  }

  const dom = new JSDOM('<!doctype html><html><body></body></html>')

  domGlobalDescriptors = domGlobalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  domWindow = dom.window as unknown as Window

  for (const key of domGlobalKeys) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: dom.window[key],
    })
  }
}

function restoreDom() {
  cleanup()

  for (const [key, descriptor] of domGlobalDescriptors.reverse()) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor)
      continue
    }

    delete (globalThis as Record<string, unknown>)[key]
  }

  domGlobalDescriptors = []
  domWindow?.close()
  domWindow = null
}

function renderWithQueryClient(element: ReactElement) {
  const queryClient = createQueryClient()

  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>)
}

function renderWithoutWindow(element: ReactElement) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')

  delete (globalThis as Record<string, unknown>).window

  try {
    return renderToStaticMarkup(
      <RouterContextProvider router={createTestRouter()}>
        <QueryClientProvider client={createQueryClient()}>{element}</QueryClientProvider>
      </RouterContextProvider>,
    )
  } finally {
    if (windowDescriptor) {
      Object.defineProperty(globalThis, 'window', windowDescriptor)
    }
  }
}

beforeAll(async () => {
  mock.module('../src/features/auth/data-access/get-app-auth-state', () => ({
    getAppAuthStateQueryOptions: () => ({}),
  }))
  mock.module('../src/features/cli-auth/data-access/verify-cli-auth-user-code-fn', () => ({
    validCliAuthUserCodeVerification: {
      error: null,
      state: 'ready',
    },
    verifyCliAuthUserCode: async ({ data }: { data: { userCode: string } }) => {
      verifyCliAuthUserCodeCalls.push(data.userCode)

      return userCodeVerificationResult
    },
  }))

  ensureDom()
  ;({ CliAuthFeatureAuthorize } = await import('../src/features/cli-auth/feature/cli-auth-feature-authorize'))
  ;({ Route: CliAuthorizeRoute } = await import('../src/routes/cli/authorize'))
})

afterEach(() => {
  cleanup()
  userCodeVerificationResult = {
    error: null,
    state: 'ready',
  }
  verifyCliAuthUserCodeCalls.length = 0
})

afterAll(() => {
  mock.restore()
  restoreDom()
})

describe('CLI authorize route', () => {
  test('missing code renders manual code entry', () => {
    const { client } = createAuthClient()
    const view = renderWithQueryClient(
      <CliAuthFeatureAuthorize authClient={client as never} user={createSession().user} />,
    )

    expect(view.getByText('Authorize CLI')).toBeTruthy()
    expect(view.getByLabelText('Code')).toBeTruthy()
  })

  test('manual code entry clears validation errors while editing', async () => {
    const { client } = createAuthClient()
    const view = renderWithQueryClient(
      <CliAuthFeatureAuthorize authClient={client as never} user={createSession().user} />,
    )

    fireEvent.click(view.getByRole('button', { name: 'Continue' }))
    expect(view.getByText('Enter the code shown in your terminal.')).toBeTruthy()

    fireEvent.input(view.getByLabelText('Code'), {
      target: {
        value: 'ABCD1234',
      },
    })

    await waitFor(() => expect(view.queryByText('Enter the code shown in your terminal.')).toBeNull())
  })

  test('normalizes existing user codes', () => {
    expect(normalizeCliAuthUserCode(' abcd-1234 ')).toBe('ABCD1234')
    expect(validateCliAuthorizeSearch({ user_code: ' ab cd-12 34 ' })).toEqual({
      user_code: 'ABCD1234',
    })
  })

  test('verifies user codes during route loading', async () => {
    const result = await CliAuthorizeRoute.options.beforeLoad?.({
      context: {
        queryClient: {
          ensureQueryData: async () => ({
            session: createSession(),
          }),
        },
      },
      location: {
        href: '/cli/authorize?user_code=ab-cd-12-34',
      },
      search: {
        user_code: 'ab-cd-12-34',
      },
    } as never)

    expect(result).toMatchObject({
      session: createSession(),
      userCode: 'ABCD1234',
      userCodeVerification: {
        error: null,
        state: 'ready',
      },
    })
    expect(verifyCliAuthUserCodeCalls).toEqual(['ABCD1234'])
  })

  test('returns invalid user code verification from route loading', async () => {
    userCodeVerificationResult = {
      error: 'Invalid or expired CLI authorization code.',
      state: 'invalid',
    }

    const result = await CliAuthorizeRoute.options.beforeLoad?.({
      context: {
        queryClient: {
          ensureQueryData: async () => ({
            session: createSession(),
          }),
        },
      },
      location: {
        href: '/cli/authorize?user_code=ABCD1234',
      },
      search: {
        user_code: 'ABCD1234',
      },
    } as never)

    expect(result).toMatchObject({
      userCode: 'ABCD1234',
      userCodeVerification: {
        error: 'Invalid or expired CLI authorization code.',
        state: 'invalid',
      },
    })
    expect(verifyCliAuthUserCodeCalls).toEqual(['ABCD1234'])
  })

  test('redirects unauthenticated users to login with a return URL', async () => {
    try {
      await CliAuthorizeRoute.options.beforeLoad?.({
        context: {
          queryClient: {
            ensureQueryData: async () => ({
              session: null,
            }),
          },
        },
        location: {
          href: '/cli/authorize?user_code=ABCD1234',
        },
        search: {
          user_code: 'ABCD1234',
        },
      } as never)
    } catch (error) {
      expect(error).toMatchObject({
        options: {
          search: {
            redirect: '/cli/authorize?user_code=ABCD1234',
          },
          to: '/login',
        },
      })

      return
    }

    throw new Error('Expected the route to redirect.')
  })

  test('server rendering a device request does not require browser env', () => {
    const html = renderWithoutWindow(<CliAuthFeatureAuthorize initialUserCode="ABCD1234" user={createSession().user} />)

    expect(html).toContain('Authorize Tokengator CLI')
  })

  test('approve calls the device approval endpoint and shows the final state', async () => {
    const { calls, client } = createAuthClient()
    const view = renderWithQueryClient(
      <CliAuthFeatureAuthorize authClient={client as never} initialUserCode="ABCD1234" user={createSession().user} />,
    )

    await waitFor(() => expect(view.getByRole('button', { name: 'Approve' })).toBeTruthy())
    fireEvent.click(view.getByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(view.getByText('CLI Access Approved')).toBeTruthy())
    expect(view.getByText('Return to your terminal to continue.')).toBeTruthy()
    expect(calls.approve).toEqual([
      {
        userCode: 'ABCD1234',
      },
    ])
    expect(calls.verify).toEqual([])
  })

  test('deny calls the device denial endpoint and shows the final state', async () => {
    const { calls, client } = createAuthClient()
    const view = renderWithQueryClient(
      <CliAuthFeatureAuthorize authClient={client as never} initialUserCode="ABCD1234" user={createSession().user} />,
    )

    await waitFor(() => expect(view.getByRole('button', { name: 'Deny' })).toBeTruthy())
    fireEvent.click(view.getByRole('button', { name: 'Deny' }))

    await waitFor(() => expect(view.getByText('CLI Access Denied')).toBeTruthy())
    expect(view.getByText('Return to your terminal to continue.')).toBeTruthy()
    expect(calls.deny).toEqual([
      {
        userCode: 'ABCD1234',
      },
    ])
    expect(calls.verify).toEqual([])
  })

  test('invalid route verification disables device actions and offers manual entry', () => {
    const { client } = createAuthClient()
    const view = renderWithQueryClient(
      <CliAuthFeatureAuthorize
        authClient={client as never}
        initialUserCode="ABCD1234"
        user={createSession().user}
        userCodeVerification={{
          error: 'Invalid or expired CLI authorization code.',
          state: 'invalid',
        }}
      />,
    )

    expect(view.getByText('Invalid or expired CLI authorization code.')).toBeTruthy()
    expect((view.getByRole('button', { name: 'Try a different code' }) as HTMLButtonElement).disabled).toBe(false)
    expect((view.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(true)
    expect((view.getByRole('button', { name: 'Deny' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
