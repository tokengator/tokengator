import { useQuery } from '@tanstack/react-query'

import type { OrganizationListMineData } from './get-organization-list-mine'

import { orpc } from '@/utils/orpc'

interface UseOrganizationListMineOptions {
  enabled?: boolean
  initialData?: OrganizationListMineData
}

export function useOrganizationListMine(userId: string, options: UseOrganizationListMineOptions = {}) {
  return useQuery({
    ...orpc.organization.listMine.queryOptions(),
    enabled: (options.enabled ?? true) && Boolean(userId),
    initialData: options.initialData,
    queryKey: [...orpc.organization.listMine.key(), userId],
    staleTime: Number.POSITIVE_INFINITY,
  })
}
