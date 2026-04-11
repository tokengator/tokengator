import { queryOptions, useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function getAdminUserIdentitiesQueryKey(userId: string) {
  return orpc.adminUser.listIdentities.key({
    input: {
      userId,
    },
  })
}

export function getAdminUserIdentitiesQueryOptions(userId: string) {
  return queryOptions({
    ...orpc.adminUser.listIdentities.queryOptions({
      input: {
        userId,
      },
    }),
    enabled: Boolean(userId),
    queryKey: getAdminUserIdentitiesQueryKey(userId),
  })
}

export function useAdminUserIdentitiesQuery(userId: string) {
  return useQuery(getAdminUserIdentitiesQueryOptions(userId))
}
