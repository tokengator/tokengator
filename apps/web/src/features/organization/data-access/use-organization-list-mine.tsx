import { useQuery } from '@tanstack/react-query'
import type { OrganizationListMineResult } from '@tokengator/sdk'

import { getOrganizationListMineQueryOptions } from './get-organization-list-mine'

interface UseOrganizationListMineOptions {
  enabled?: boolean
  initialData?: OrganizationListMineResult
}

export function useOrganizationListMine(userId: string, options: UseOrganizationListMineOptions = {}) {
  return useQuery({
    ...getOrganizationListMineQueryOptions(userId),
    enabled: (options.enabled ?? true) && Boolean(userId),
    initialData: options.initialData,
  })
}
