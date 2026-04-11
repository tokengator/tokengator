import { queryOptions, useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function getProfileSettingsQueryKey(userId: string) {
  return [...orpc.profile.getSettings.key(), userId] as const
}

export function getProfileSettingsQueryOptions(userId: string) {
  return queryOptions({
    ...orpc.profile.getSettings.queryOptions(),
    queryKey: getProfileSettingsQueryKey(userId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useProfileSettings(userId: string) {
  return useQuery({
    ...getProfileSettingsQueryOptions(userId),
    enabled: Boolean(userId),
  })
}
