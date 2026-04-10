import { useQuery } from '@tanstack/react-query'
import type { AdminAssetListInput } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

export function useAdminAssetListQuery(input: AdminAssetListInput) {
  return useQuery(
    orpc.adminAsset.list.queryOptions({
      enabled: Boolean(input.assetGroupId),
      input,
    }),
  )
}
