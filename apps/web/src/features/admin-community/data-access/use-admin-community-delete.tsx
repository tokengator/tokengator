import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { getAdminCommunityGetQueryKey } from './use-admin-community-get-query'

export function useAdminCommunityDelete() {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminOrganization.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (_, variables) => {
        queryClient.setQueryData(getAdminCommunityGetQueryKey(variables.organizationId), null)
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.list.key(),
        })
        toast.success('Community deleted.')
      },
    }),
  )
}
