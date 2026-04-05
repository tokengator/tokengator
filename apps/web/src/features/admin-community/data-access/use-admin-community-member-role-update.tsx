import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getAdminCommunityGetQueryKey } from './use-admin-community-get-query'

import { orpc } from '@/utils/orpc'

export function useAdminCommunityMemberRoleUpdate(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminOrganization.updateMemberRole.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getAdminCommunityGetQueryKey(organizationId),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.adminOrganization.list.key(),
          }),
        ])
        toast.success('Member role updated.')
      },
    }),
  )
}
