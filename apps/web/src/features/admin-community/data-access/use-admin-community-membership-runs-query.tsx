import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useAdminCommunityMembershipRunsQuery(organizationId: string) {
  return useQuery(
    orpc.adminCommunityRole.listRuns.queryOptions({
      enabled: Boolean(organizationId),
      input: {
        kind: 'membership',
        limit: 5,
        organizationId,
      },
    }),
  )
}
