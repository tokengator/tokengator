import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

interface UseAdminCommunityDirectoryQueryInput {
  search?: string
}

export function useAdminCommunityDirectoryQuery(input: UseAdminCommunityDirectoryQueryInput) {
  return useQuery(
    orpc.adminOrganization.list.queryOptions({
      input: {
        limit: 25,
        search: input.search,
      },
    }),
  )
}
