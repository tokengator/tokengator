import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useAdminCommunityDiscordAnnouncementCatalogQuery(organizationId: string) {
  return useQuery(
    orpc.adminOrganization.getDiscordAnnouncementCatalog.queryOptions({
      enabled: Boolean(organizationId),
      input: {
        organizationId,
      },
    }),
  )
}
