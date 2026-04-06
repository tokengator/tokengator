import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { useAdminAssetInvalidation } from './use-admin-asset-invalidation'

export function useAdminAssetDelete() {
  const asset = useAdminAssetInvalidation()

  return useMutation(
    orpc.adminAsset.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await asset.invalidateAssetList()
        toast.success('Asset deleted.')
      },
    }),
  )
}
