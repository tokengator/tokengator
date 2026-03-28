import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

interface UseAdminAssetGroupListQueryInput {
  limit?: number
  offset?: number
  search?: string
}

export function useAdminAssetGroupListQuery(input: UseAdminAssetGroupListQueryInput) {
  return useQuery(
    orpc.adminAssetGroup.list.queryOptions({
      input,
    }),
  )
}
