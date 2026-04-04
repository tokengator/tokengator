import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

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
