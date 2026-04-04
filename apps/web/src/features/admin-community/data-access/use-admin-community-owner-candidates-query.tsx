import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

interface UseAdminCommunityOwnerCandidatesQueryInput {
  enabled: boolean
  search?: string
}

export function useAdminCommunityOwnerCandidatesQuery(input: UseAdminCommunityOwnerCandidatesQueryInput) {
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
