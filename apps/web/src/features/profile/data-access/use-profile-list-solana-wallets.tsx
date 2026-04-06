import { queryOptions, useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function getProfileListSolanaWalletsQueryKey(userId: string) {
  return [...orpc.profile.listSolanaWallets.key(), userId] as const
}

export function getProfileListSolanaWalletsQueryOptions(userId: string) {
  return queryOptions({
    ...orpc.profile.listSolanaWallets.queryOptions(),
    queryKey: getProfileListSolanaWalletsQueryKey(userId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useProfileListSolanaWallets(userId: string) {
  return useQuery({
    ...getProfileListSolanaWalletsQueryOptions(userId),
    enabled: Boolean(userId),
  })
}
