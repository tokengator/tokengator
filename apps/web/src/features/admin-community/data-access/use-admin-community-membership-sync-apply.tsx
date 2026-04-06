import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import type { AdminCommunityMembershipSyncResult } from './admin-community-role-types'
import { useAdminCommunityOrganizationInvalidation } from './use-admin-community-organization-invalidation'
import { useAdminCommunityRoleInvalidation } from './use-admin-community-role-invalidation'

export type { AdminCommunityMembershipSyncResult }

export function useAdminCommunityMembershipSyncApply(organizationId: string) {
  const organization = useAdminCommunityOrganizationInvalidation()
  const role = useAdminCommunityRoleInvalidation()

  return useMutation(
    orpc.adminCommunityRole.applySync.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await Promise.all([
          organization.invalidateCommunityAndMine(organizationId),
          role.invalidateRoleCatalog(organizationId),
        ])
        toast.success('Access sync applied.')
      },
    }),
  )
}
