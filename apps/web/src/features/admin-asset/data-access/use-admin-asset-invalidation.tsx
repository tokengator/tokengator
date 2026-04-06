import { useQueryClient } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

export function useAdminAssetInvalidation() {
  const queryClient = useQueryClient()

  async function invalidateAssetList() {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminAsset.list.key(),
    })
  }

  return {
    invalidateAssetList,
  }
}
