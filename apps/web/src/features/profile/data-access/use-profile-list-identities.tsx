import { queryOptions, useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function getProfileListIdentitiesQueryKey(userId: string) {
  return [...orpc.profile.listIdentities.key(), userId] as const
}

export function getProfileListIdentitiesQueryOptions(userId: string) {
  return queryOptions({
    ...orpc.profile.listIdentities.queryOptions(),
    queryKey: getProfileListIdentitiesQueryKey(userId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useProfileListIdentities(userId: string) {
  return useQuery({
    ...getProfileListIdentitiesQueryOptions(userId),
    enabled: Boolean(userId),
  })
}
