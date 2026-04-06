import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { useAdminCommunityOrganizationInvalidation } from './use-admin-community-organization-invalidation'
import { useAdminCommunityRoleInvalidation } from './use-admin-community-role-invalidation'

export function useAdminCommunityRoleDelete(organizationId: string) {
  const organization = useAdminCommunityOrganizationInvalidation()
  const role = useAdminCommunityRoleInvalidation()

  return useMutation(
    orpc.adminCommunityRole.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await Promise.all([
          organization.invalidateCommunityAndMine(organizationId),
          role.invalidateRoleCatalog(organizationId),
        ])
        toast.success('Community role deleted.')
      },
    }),
  )
}
