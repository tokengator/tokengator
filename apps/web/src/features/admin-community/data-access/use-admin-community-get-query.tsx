import { queryOptions, useQuery } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { orpc } from '@/lib/orpc'
import { serverOrpcClient } from '@/lib/orpc-server'

export type AdminCommunityGetResult = Awaited<ReturnType<typeof orpc.adminOrganization.get.call>>
export type AdminCommunityDiscordConnection = NonNullable<AdminCommunityGetResult['discordConnection']>

interface AdminCommunityGetInput {
  organizationId: string
}

export const getAdminCommunity = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: AdminCommunityGetInput) => input)
  .handler(async ({ data }) => {
    return serverOrpcClient.adminOrganization.get({
      organizationId: data.organizationId,
    })
  })

function isNotFoundError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'NOT_FOUND'
}

async function getAdminCommunityOrNull(query: () => Promise<AdminCommunityGetResult>) {
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
    initialData?: AdminCommunityGetResult | null
  },
) {
  return useQuery({
    ...getAdminCommunityGetQueryOptions(organizationId),
    initialData: options?.initialData,
  })
}
