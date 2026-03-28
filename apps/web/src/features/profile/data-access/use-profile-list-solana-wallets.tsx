import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

export function useProfileListSolanaWallets(userId: string) {
  return useQuery({
    ...orpc.profile.listSolanaWallets.queryOptions(),
    enabled: Boolean(userId),
    queryKey: [...orpc.profile.listSolanaWallets.key(), userId],
    staleTime: Number.POSITIVE_INFINITY,
  })
}
