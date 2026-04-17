import { useQueryClient } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'
import { useAdminCommunityOrganizationInvalidation } from './use-admin-community-organization-invalidation'

export function useAdminCommunityDiscordInvalidation() {
  const organization = useAdminCommunityOrganizationInvalidation()
  const queryClient = useQueryClient()

  async function invalidateAnnouncements(organizationId: string) {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminOrganization.getDiscordAnnouncementCatalog.key({
        input: {
          organizationId,
        },
      }),
    })
  }

  async function invalidateConnection(organizationId: string) {
    await Promise.all([
      invalidateAnnouncements(organizationId),
      invalidateGuildRoles(organizationId),
      organization.invalidateCommunity(organizationId),
    ])
  }

  async function invalidateGuildRoles(organizationId: string) {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminCommunityRole.listDiscordGuildRoles.key({
        input: {
          organizationId,
        },
      }),
    })
  }

  return {
    invalidateAnnouncements,
    invalidateConnection,
    invalidateGuildRoles,
  }
}
