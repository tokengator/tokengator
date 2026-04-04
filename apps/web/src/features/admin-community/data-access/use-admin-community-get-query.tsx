import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

export function useAdminCommunityGetQuery(organizationId: string) {
  return useQuery(
    orpc.adminOrganization.get.queryOptions({
      enabled: Boolean(organizationId),
      input: {
        organizationId,
      },
    }),
  )
}
