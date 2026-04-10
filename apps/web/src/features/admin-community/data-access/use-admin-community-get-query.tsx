import { queryOptions, useQuery } from '@tanstack/react-query'
import type { AdminOrganizationDetailEntity } from '@tokengator/sdk'

import { getAdminCommunity } from '@/features/admin-community/data-access/get-admin-community-fn'
import { orpc } from '@/lib/orpc'

function isNotFoundError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'NOT_FOUND'
}

async function getAdminCommunityOrNull(query: () => Promise<AdminOrganizationDetailEntity>) {
  try {
    return await query()
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export function getAdminCommunityGetQueryKey(organizationId: string) {
  return orpc.adminOrganization.get.key({
    input: {
      organizationId,
    },
  })
}

export function getAdminCommunityGetQueryOptions(organizationId: string) {
  return queryOptions({
    enabled: Boolean(organizationId),
    queryFn: () => getAdminCommunityOrNull(() => orpc.adminOrganization.get.call({ organizationId })),
    queryKey: getAdminCommunityGetQueryKey(organizationId),
  })
}

export function getAdminCommunityGetRouteQueryOptions(organizationId: string) {
  return queryOptions({
    enabled: Boolean(organizationId),
    queryFn: () =>
      getAdminCommunityOrNull(() =>
        getAdminCommunity({
          data: {
            organizationId,
          },
        }),
      ),
    queryKey: getAdminCommunityGetQueryKey(organizationId),
  })
}

export function useAdminCommunityGetQuery(
  organizationId: string,
  options?: {
    initialData?: AdminOrganizationDetailEntity | null
  },
) {
  return useQuery({
    ...getAdminCommunityGetQueryOptions(organizationId),
    initialData: options?.initialData,
  })
}
