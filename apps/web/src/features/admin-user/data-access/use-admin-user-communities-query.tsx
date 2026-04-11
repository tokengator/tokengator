import { queryOptions, useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function getAdminUserCommunitiesQueryKey(userId: string) {
  return orpc.adminUser.listCommunities.key({
    input: {
      userId,
    },
  })
}

export function getAdminUserCommunitiesQueryOptions(userId: string) {
  return queryOptions({
    ...orpc.adminUser.listCommunities.queryOptions({
      input: {
        userId,
      },
    }),
    enabled: Boolean(userId),
    queryKey: getAdminUserCommunitiesQueryKey(userId),
  })
}

export function useAdminUserCommunitiesQuery(userId: string) {
  return useQuery(getAdminUserCommunitiesQueryOptions(userId))
}
