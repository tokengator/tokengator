import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import type { AdminCommunityDiscordSyncResult } from './admin-community-role-types'
import { matchesAdminCommunityListRunsQueryForOrganization } from './admin-community-list-runs-query-predicate'

export type { AdminCommunityDiscordSyncResult }

export function useAdminCommunityDiscordSyncApply(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminCommunityRole.applyDiscordRoleSync.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.adminCommunityRole.getSyncStatus.key({
              input: {
                organizationId,
              },
            }),
          }),
          queryClient.invalidateQueries({
            predicate: (query) => matchesAdminCommunityListRunsQueryForOrganization(query.queryKey, organizationId),
            queryKey: orpc.adminCommunityRole.listRuns.key(),
          }),
        ])
        toast.success('Discord role reconcile applied.')
      },
    }),
  )
}
