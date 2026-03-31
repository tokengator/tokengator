import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'

export function useAdminAssetGroupIndex() {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminAssetGroup.index.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.adminAsset.list.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.adminAssetGroup.get.key({
              input: {
                assetGroupId: result.assetGroupId,
              },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.adminAssetGroup.list.key(),
          }),
        ])
        toast.success(
          `Indexed ${result.total} assets (${result.inserted} new, ${result.updated} updated, ${result.deleted} removed).`,
        )
      },
    }),
  )
}
