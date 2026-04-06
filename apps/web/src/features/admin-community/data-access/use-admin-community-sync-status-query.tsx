import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useAdminCommunitySyncStatusQuery(organizationId: string) {
  return useQuery(
    orpc.adminCommunityRole.getSyncStatus.queryOptions({
      enabled: Boolean(organizationId),
      input: {
        organizationId,
      },
    }),
  )
}
