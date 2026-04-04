import { queryOptions, useQuery } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { orpc } from '@/utils/orpc'
import { serverOrpcClient } from '@/utils/orpc-server'

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

export function getAdminCommunityGetQueryOptions(organizationId: string) {
  return orpc.adminOrganization.get.queryOptions({
    enabled: Boolean(organizationId),
    input: {
      organizationId,
    },
  })
}

export function getAdminCommunityGetRouteQueryOptions(organizationId: string) {
  return queryOptions({
    enabled: Boolean(organizationId),
    queryFn: () =>
      getAdminCommunity({
        data: {
          organizationId,
        },
      }),
    queryKey: orpc.adminOrganization.get.key({
      input: {
        organizationId,
      },
    }),
  })
}

export function useAdminCommunityGetQuery(
  organizationId: string,
  options?: {
    initialData?: AdminCommunityGetResult
  },
) {
  return useQuery({
    ...getAdminCommunityGetQueryOptions(organizationId),
    initialData: options?.initialData,
  })
}
