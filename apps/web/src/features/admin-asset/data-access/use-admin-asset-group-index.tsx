import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminAssetGroupInvalidation } from './use-admin-asset-group-invalidation'

export function useAdminAssetGroupIndex() {
  const group = useAdminAssetGroupInvalidation()

  return useMutation(
    orpc.adminAssetGroup.index.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (result) => {
        await group.invalidateGroupIndex(result.assetGroupId)
        toast.success(
          `Indexed ${result.total} assets (${result.inserted} new, ${result.updated} updated, ${result.deleted} removed).`,
        )
      },
    }),
  )
}
