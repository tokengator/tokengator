import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'

export function useAdminCommunityUpdate() {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminOrganization.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (updatedOrganization) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.adminOrganization.get.key({
              input: {
                organizationId: updatedOrganization.id,
              },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.adminOrganization.list.key(),
          }),
        ])
        toast.success('Community updated.')
      },
    }),
  )
}
