import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Toaster } from '@tokengator/ui/components/sonner'

import type { orpc } from '@/lib/orpc'
import {
  getAppAuthStateQueryOptions,
  populateAppAuthStateRelatedQueries,
} from '@/features/auth/data-access/get-app-auth-state'
import { ShellFeatureFrame } from '@/features/shell/feature/shell-feature-frame'
import { AppProviders } from '@/lib/app-providers'

import appCss from '../index.css?url'

const AppDevtools = import.meta.env.DEV
  ? lazy(async () => ({
      default: (await import('@/lib/app-devtools')).AppDevtools,
    }))
  : null

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
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
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
          <ShellFeatureFrame>
            <Outlet />
          </ShellFeatureFrame>
          <Toaster richColors />
          {AppDevtools ? (
            <Suspense fallback={null}>
              <AppDevtools />
            </Suspense>
          ) : null}
        </AppProviders>
        <Scripts />
      </body>
    </html>
  )
}
