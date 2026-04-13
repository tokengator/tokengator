import { queryOptions, useQuery } from '@tanstack/react-query'
import type { AppAuthState } from '@/features/auth/data-access/get-app-auth-state'

import { orpc } from '@/lib/orpc'

import { getProfileListIdentities } from './get-profile-list-identities-fn'

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

export function getProfileListIdentitiesRouteQueryOptions(userId: string) {
  return queryOptions({
    enabled: Boolean(userId),
    queryFn: () => getProfileListIdentities(),
    queryKey: getProfileListIdentitiesQueryKey(userId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useProfileListIdentities(
  userId: string,
  options?: {
    initialData?: NonNullable<AppAuthState['identities']>
  },
) {
  return useQuery({
    ...getProfileListIdentitiesQueryOptions(userId),
    enabled: Boolean(userId),
    initialData: options?.initialData,
  })
}
