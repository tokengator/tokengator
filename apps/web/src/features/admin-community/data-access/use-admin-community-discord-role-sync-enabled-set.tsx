import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminCommunityOrganizationInvalidation } from './use-admin-community-organization-invalidation'
import { useAdminCommunityRoleInvalidation } from './use-admin-community-role-invalidation'

export function useAdminCommunityDiscordRoleSyncEnabledSet(organizationId: string) {
  const organization = useAdminCommunityOrganizationInvalidation()
  const role = useAdminCommunityRoleInvalidation()

  return useMutation(
    orpc.adminOrganization.setDiscordRoleSyncEnabled.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (_connection, input) => {
        await Promise.all([
          organization.invalidateCommunity(organizationId),
          role.invalidateRoleSyncStatusAndRuns(organizationId),
        ])
        toast.success(input.enabled ? 'Discord role sync enabled.' : 'Discord role sync disabled.')
      },
    }),
  )
}
