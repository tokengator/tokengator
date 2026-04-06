import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { useAdminAssetGroupInvalidation } from './use-admin-asset-group-invalidation'

export function useAdminAssetGroupUpdate() {
  const group = useAdminAssetGroupInvalidation()

  return useMutation(
    orpc.adminAssetGroup.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (assetGroup) => {
        await group.invalidateGroupAndList(assetGroup.id)
        toast.success('Asset group updated.')
      },
    }),
  )
}
