import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { useAdminCommunityOrganizationInvalidation } from './use-admin-community-organization-invalidation'

export function useAdminCommunityMemberRemove(organizationId: string) {
  const organization = useAdminCommunityOrganizationInvalidation()

  return useMutation(
    orpc.adminOrganization.removeMember.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await organization.invalidateCommunityAndDirectory(organizationId)
        toast.success('Member removed.')
      },
    }),
  )
}
