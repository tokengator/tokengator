import { useQueryClient } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'
import { getAdminCommunityGetQueryKey } from './use-admin-community-get-query'

export function useAdminCommunityOrganizationInvalidation() {
  const queryClient = useQueryClient()

  async function invalidateCommunity(organizationId: string) {
    await queryClient.invalidateQueries({
      queryKey: getAdminCommunityGetQueryKey(organizationId),
    })
  }

  async function invalidateCommunityAndDirectory(organizationId: string) {
    await Promise.all([invalidateCommunity(organizationId), invalidateDirectory()])
  }

  async function invalidateCommunityAndMine(organizationId: string) {
    await Promise.all([
      invalidateCommunity(organizationId),
      queryClient.invalidateQueries({
        queryKey: orpc.organization.listMine.key(),
      }),
    ])
  }

  async function invalidateDirectory() {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminOrganization.list.key(),
    })
  }

  return {
    invalidateCommunity,
    invalidateCommunityAndDirectory,
    invalidateCommunityAndMine,
    invalidateDirectory,
  }
}
