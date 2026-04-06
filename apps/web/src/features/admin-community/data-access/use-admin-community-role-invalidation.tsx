import { useQueryClient } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'
import { matchesAdminCommunityListRunsQueryForOrganization } from './admin-community-list-runs-query-predicate'

export function useAdminCommunityRoleInvalidation() {
  const queryClient = useQueryClient()

  async function invalidateRoleCatalog(organizationId: string) {
    await Promise.all([
      invalidateRoleList(organizationId),
      invalidateRoleRuns(organizationId),
      invalidateRoleSyncStatus(organizationId),
    ])
  }

  async function invalidateRoleList(organizationId: string) {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminCommunityRole.list.key({
        input: {
          organizationId,
        },
      }),
    })
  }

  async function invalidateRoleRuns(organizationId: string) {
    await queryClient.invalidateQueries({
      predicate: (query) => matchesAdminCommunityListRunsQueryForOrganization(query.queryKey, organizationId),
      queryKey: orpc.adminCommunityRole.listRuns.key(),
    })
  }

  async function invalidateRoleSyncStatus(organizationId: string) {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminCommunityRole.getSyncStatus.key({
        input: {
          organizationId,
        },
      }),
    })
  }

  async function invalidateRoleSyncStatusAndRuns(organizationId: string) {
    await Promise.all([invalidateRoleRuns(organizationId), invalidateRoleSyncStatus(organizationId)])
  }

  return {
    invalidateRoleCatalog,
    invalidateRoleSyncStatusAndRuns,
  }
}
