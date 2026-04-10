import { queryOptions } from '@tanstack/react-query'
import type { OrganizationListMineResult } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

import { getOrganizationListMine } from './get-organization-list-mine-fn'

const emptyOrganizationListMineResult = {
  organizations: [],
} satisfies OrganizationListMineResult

export function getOrganizationListMineQueryOptions(userId: string) {
  return queryOptions({
    queryFn: async () => (await getOrganizationListMine()) ?? emptyOrganizationListMineResult,
    queryKey: [...orpc.organization.listMine.key(), userId],
    staleTime: Number.POSITIVE_INFINITY,
  })
}
