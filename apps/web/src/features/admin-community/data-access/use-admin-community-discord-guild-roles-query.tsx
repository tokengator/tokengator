import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useAdminCommunityDiscordGuildRolesQuery(organizationId: string) {
  return useQuery(
    orpc.adminCommunityRole.listDiscordGuildRoles.queryOptions({
      enabled: Boolean(organizationId),
      input: {
        organizationId,
      },
    }),
  )
}
