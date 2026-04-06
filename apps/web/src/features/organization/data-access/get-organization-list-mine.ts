import { queryOptions } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

import { getOrganizationListMine } from './get-organization-list-mine-fn'

export interface OrganizationListMineOrganization {
  gatedRoles: Array<{
    id: string
    name: string
    slug: string
  }>
  id: string
  logo: string | null
  name: string
  role: string
  slug: string
}

export interface OrganizationListMineData {
  organizations: OrganizationListMineOrganization[]
}

export function getOrganizationListMineQueryOptions(userId: string) {
  return queryOptions({
    queryFn: async () =>
      (await getOrganizationListMine()) ?? {
        organizations: [],
      },
    queryKey: [...orpc.organization.listMine.key(), userId],
    staleTime: Number.POSITIVE_INFINITY,
  })
}
