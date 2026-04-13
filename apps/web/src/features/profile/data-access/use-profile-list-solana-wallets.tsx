import { queryOptions, useQuery } from '@tanstack/react-query'
import type { AppAuthState } from '@/features/auth/data-access/get-app-auth-state'

import { orpc } from '@/lib/orpc'

import { getProfileListSolanaWallets } from './get-profile-list-solana-wallets-fn'

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

export function getProfileListSolanaWalletsRouteQueryOptions(userId: string) {
  return queryOptions({
    enabled: Boolean(userId),
    queryFn: () => getProfileListSolanaWallets(),
    queryKey: getProfileListSolanaWalletsQueryKey(userId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useProfileListSolanaWallets(
  userId: string,
  options?: {
    initialData?: NonNullable<AppAuthState['solanaWallets']>
  },
) {
  return useQuery({
    ...getProfileListSolanaWalletsQueryOptions(userId),
    enabled: Boolean(userId),
    initialData: options?.initialData,
  })
}
