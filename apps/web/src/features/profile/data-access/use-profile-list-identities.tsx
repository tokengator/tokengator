import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

export function useProfileListIdentities(userId: string) {
  return useQuery({
    ...orpc.profile.listIdentities.queryOptions(),
    enabled: Boolean(userId),
    queryKey: [...orpc.profile.listIdentities.key(), userId],
    staleTime: Number.POSITIVE_INFINITY,
  })
}
