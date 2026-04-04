import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { matchesAdminCommunityListRunsQueryForOrganization } from './admin-community-list-runs-query-predicate'

export function useAdminCommunityDiscordRoleMappingSet(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminCommunityRole.setDiscordRoleMapping.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (result, variables) => {
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
            queryKey: orpc.adminCommunityRole.listDiscordGuildRoles.key({
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
        toast.success(
          result.mapping.status === 'ready'
            ? 'Discord role mapping saved.'
            : variables.discordRoleId === null
              ? 'Discord role mapping cleared.'
              : 'Discord role mapping saved. Check diagnostics before syncing Discord roles.',
        )
      },
    }),
  )
}
