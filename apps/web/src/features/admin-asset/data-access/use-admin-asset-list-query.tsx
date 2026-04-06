import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

interface UseAdminAssetListQueryInput {
  address?: string
  assetGroupId: string
  limit?: number
  offset?: number
  owner?: string
  resolverKind?: 'helius-collection-assets' | 'helius-token-accounts'
}

export function useAdminAssetListQuery(input: UseAdminAssetListQueryInput) {
  return useQuery(
    orpc.adminAsset.list.queryOptions({
      enabled: Boolean(input.assetGroupId),
      input,
    }),
  )
}
