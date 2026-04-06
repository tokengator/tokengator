import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import type { AdminCommunityDiscordSyncResult } from './admin-community-role-types'
import { useAdminCommunityRoleInvalidation } from './use-admin-community-role-invalidation'

export type { AdminCommunityDiscordSyncResult }

export function useAdminCommunityDiscordSyncApply(organizationId: string) {
  const role = useAdminCommunityRoleInvalidation()

  return useMutation(
    orpc.adminCommunityRole.applyDiscordRoleSync.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await role.invalidateRoleSyncStatusAndRuns(organizationId)
        toast.success('Discord role reconcile applied.')
      },
    }),
  )
}
