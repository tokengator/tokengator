import { useQuery } from '@tanstack/react-query'
import type { AdminOrganizationListInput } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

export function useAdminCommunityDirectoryQuery(input: { search?: NonNullable<AdminOrganizationListInput>['search'] }) {
  return useQuery(
    orpc.adminOrganization.list.queryOptions({
      input: {
        limit: 25,
        search: input.search,
      },
    }),
  )
}
