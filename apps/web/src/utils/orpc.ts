import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { env } from '@tokengator/env/web'
import { createOrpcClient, type OrpcClient } from '@tokengator/sdk'

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        toast.error(`Error: ${error.message}`, {
          action: {
            label: 'retry',
            onClick: () => query.invalidate(),
          },
        })
      },
    }),
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (typeof document === 'undefined') {
    return createQueryClient()
  }

  browserQueryClient ??= createQueryClient()

  return browserQueryClient
}

export const client: OrpcClient = createOrpcClient({
  baseUrl: env.VITE_API_URL,
})

export const orpc = createTanstackQueryUtils(client)
