import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useCommunityCollectionOwnerCandidatesQuery(input: { enabled: boolean; search?: string }) {
  return useQuery(
    orpc.community.listCollectionOwnerCandidates.queryOptions({
      enabled: input.enabled,
      input: {
        limit: 10,
        search: input.search,
      },
    }),
  )
}
