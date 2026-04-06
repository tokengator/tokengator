import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { getAdminCommunityGetQueryKey } from './use-admin-community-get-query'
import { useAdminCommunityOrganizationInvalidation } from './use-admin-community-organization-invalidation'

export function useAdminCommunityDelete() {
  const organization = useAdminCommunityOrganizationInvalidation()
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminOrganization.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (_, variables) => {
        queryClient.setQueryData(getAdminCommunityGetQueryKey(variables.organizationId), null)
        await organization.invalidateDirectory()
        toast.success('Community deleted.')
      },
    }),
  )
}
