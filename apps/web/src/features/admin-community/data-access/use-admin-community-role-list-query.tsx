import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

export function useAdminCommunityRoleListQuery(organizationId: string) {
  return useQuery(
    orpc.adminCommunityRole.list.queryOptions({
      enabled: Boolean(organizationId),
      input: {
        organizationId,
      },
    }),
  )
}
