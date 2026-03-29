import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@tokengator/ui/components/sonner'

import type { orpc } from '@/utils/orpc'
import {
  getAppAuthStateQueryOptions,
  populateAppAuthStateRelatedQueries,
} from '@/features/auth/data-access/get-app-auth-state'

import Header from '../components/header'
import { SolanaProvider } from '../components/solana/solana-provider'
import ThemeProvider from '../components/theme-provider'

import appCss from '../index.css?url'

export interface RouterAppContext {
  orpc: typeof orpc
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  beforeLoad: async ({ context }) => {
    const [appAuthState, appConfig] = await Promise.all([
      context.queryClient.ensureQueryData(getAppAuthStateQueryOptions()),
      context.queryClient.ensureQueryData(context.orpc.appConfig.queryOptions()),
    ])

    populateAppAuthStateRelatedQueries({
      appAuthState,
      queryClient: context.queryClient,
    })

    return { appAuthState, appConfig }
  },
  component: RootDocument,

  head: () => ({
    links: [
      {
        href: appCss,
        rel: 'stylesheet',
      },
    ],
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        content: 'width=device-width, initial-scale=1',
        name: 'viewport',
      },
      {
        title: 'TokenGator',
      },
    ],
  }),
})

function RootDocument() {
  const { appConfig } = Route.useRouteContext()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <SolanaProvider appConfig={appConfig}>
            <div className="grid h-svh min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
              <Header />
              <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto">
                <Outlet />
              </div>
            </div>
          </SolanaProvider>
          <Toaster richColors />
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
