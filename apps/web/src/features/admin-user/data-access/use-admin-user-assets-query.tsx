import { queryOptions, useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function getAdminUserAssetsQueryKey(input: { limit?: number; offset?: number; userId: string }) {
  return orpc.adminUser.listAssets.key({
    input,
  })
}

export function getAdminUserAssetsQueryOptions(input: { limit?: number; offset?: number; userId: string }) {
  return queryOptions({
    ...orpc.adminUser.listAssets.queryOptions({
      input,
    }),
    enabled: Boolean(input.userId),
    queryKey: getAdminUserAssetsQueryKey(input),
  })
}

export function useAdminUserAssetsQuery(input: { limit?: number; offset?: number; userId: string }) {
  return useQuery(getAdminUserAssetsQueryOptions(input))
}
