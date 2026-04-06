import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useAdminAssetGroupGetQuery(assetGroupId: string) {
  return useQuery(
    orpc.adminAssetGroup.get.queryOptions({
      enabled: Boolean(assetGroupId),
      input: {
        assetGroupId,
      },
    }),
  )
}
