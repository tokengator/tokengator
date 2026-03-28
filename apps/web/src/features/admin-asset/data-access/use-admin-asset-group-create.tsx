import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'

export function useAdminAssetGroupCreate() {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminAssetGroup.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminAssetGroup.list.key(),
        })
        toast.success('Asset group created.')
      },
    }),
  )
}
