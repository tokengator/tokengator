import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'

export function useAdminCommunityDirectoryCreate() {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminOrganization.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.list.key(),
        })
        toast.success('Community created.')
      },
    }),
  )
}
