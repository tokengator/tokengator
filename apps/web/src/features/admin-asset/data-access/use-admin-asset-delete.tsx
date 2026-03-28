import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'

export function useAdminAssetDelete() {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminAsset.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminAsset.list.key(),
        })
        toast.success('Asset deleted.')
      },
    }),
  )
}
