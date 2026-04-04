import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

export function useAdminCommunityDiscordRunsQuery(organizationId: string) {
  return useQuery(
    orpc.adminCommunityRole.listRuns.queryOptions({
      enabled: Boolean(organizationId),
      input: {
        kind: 'discord',
        limit: 5,
        organizationId,
      },
    }),
  )
}
