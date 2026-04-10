import { useQuery } from '@tanstack/react-query'
import type { AdminAssetGroupListInput } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

export function useAdminAssetGroupListQuery(input: AdminAssetGroupListInput) {
  return useQuery(
    orpc.adminAssetGroup.list.queryOptions({
      input,
    }),
  )
}
