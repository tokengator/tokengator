import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@tokengator/ui/components/sonner'

import type { orpc } from '@/lib/orpc'
import { AppShellFeatureFrame } from '@/features/app-shell/feature/app-shell-feature-frame'
import {
  getAppAuthStateQueryOptions,
  populateAppAuthStateRelatedQueries,
} from '@/features/auth/data-access/get-app-auth-state'
import { AppProviders } from '@/lib/app-providers'

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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders>
          <AppShellFeatureFrame>
            <Outlet />
          </AppShellFeatureFrame>
          <Toaster richColors />
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
        </AppProviders>
        <Scripts />
      </body>
    </html>
  )
}
