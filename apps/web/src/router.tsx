import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'

import { ShellUiLoading } from '@/features/shell/ui/shell-ui-loading'

import { getQueryClient, orpc } from './lib/orpc'
import { routeTree } from './routeTree.gen'

export const getRouter = () => {
  const queryClient = getQueryClient()

  return createTanStackRouter({
    context: { orpc, queryClient },
    defaultNotFoundComponent: () => <div>Not Found</div>,
    defaultPendingComponent: () => <ShellUiLoading />,
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
    Wrap: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
