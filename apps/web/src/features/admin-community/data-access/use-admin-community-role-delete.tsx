import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { matchesAdminCommunityListRunsQueryForOrganization } from './admin-community-list-runs-query-predicate'

export function useAdminCommunityRoleDelete(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminCommunityRole.delete.mutationOptions({
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
            queryKey: orpc.adminCommunityRole.list.key({
              input: {
                organizationId,
              },
            }),
          }),
          queryClient.invalidateQueries({
            predicate: (query) => matchesAdminCommunityListRunsQueryForOrganization(query.queryKey, organizationId),
            queryKey: orpc.adminCommunityRole.listRuns.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.adminOrganization.get.key({
              input: {
                organizationId,
              },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.organization.listMine.key(),
          }),
        ])
        toast.success('Community role deleted.')
      },
    }),
  )
}
