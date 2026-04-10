import { useQuery } from '@tanstack/react-query'
import type { AdminOrganizationListOwnerCandidatesInput } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

export function useAdminCommunityOwnerCandidatesQuery(input: {
  enabled: boolean
  search?: NonNullable<AdminOrganizationListOwnerCandidatesInput>['search']
}) {
  return useQuery(
    orpc.adminOrganization.listOwnerCandidates.queryOptions({
      enabled: input.enabled,
      input: {
        limit: 10,
        search: input.search,
      },
    }),
  )
}
