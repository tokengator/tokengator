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
import { ensureAppOrigin } from '@/lib/ensure-app-origin'
import { getAppConfig } from '@/lib/get-app-config'

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
  beforeLoad: async ({ context, location }) => {
    const appConfig = await getAppConfig()
    await ensureAppOrigin({ appConfig, location })

    const appAuthState = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

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
        href: '/brand/icon.svg',
        rel: 'icon',
        type: 'image/svg+xml',
      },
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
        title: 'TokenGator',
      },
      {
        content:
          'Verify your identity, unlock token-gated access, and manage Discord roles and community operations from one place.',
        name: 'description',
      },
      {
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        name: 'viewport',
      },
    ],
  }),
})

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script charSet="utf-8" src="/api/__/env.js" />
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
