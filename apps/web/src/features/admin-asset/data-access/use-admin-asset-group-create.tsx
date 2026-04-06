import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { useAdminAssetGroupInvalidation } from './use-admin-asset-group-invalidation'

export function useAdminAssetGroupCreate() {
  const group = useAdminAssetGroupInvalidation()

  return useMutation(
    orpc.adminAssetGroup.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await group.invalidateGroupList()
        toast.success('Asset group created.')
      },
    }),
  )
}
