import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { useAdminCommunityOrganizationInvalidation } from './use-admin-community-organization-invalidation'

export function useAdminCommunityUpdate() {
  const organization = useAdminCommunityOrganizationInvalidation()

  return useMutation(
    orpc.adminOrganization.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (updatedOrganization) => {
        await organization.invalidateCommunityAndDirectory(updatedOrganization.id)
        toast.success('Community updated.')
      },
    }),
  )
}
