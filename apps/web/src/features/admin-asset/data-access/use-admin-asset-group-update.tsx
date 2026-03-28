import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'

export function useAdminAssetGroupUpdate() {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminAssetGroup.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (assetGroup) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.adminAssetGroup.get.key({
              input: {
                assetGroupId: assetGroup.id,
              },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.adminAssetGroup.list.key(),
          }),
        ])
        toast.success('Asset group updated.')
      },
    }),
  )
}
