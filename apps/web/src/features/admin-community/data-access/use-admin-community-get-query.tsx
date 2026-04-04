import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'

export type AdminCommunityGetResult = Awaited<ReturnType<typeof orpc.adminOrganization.get.call>>
export type AdminCommunityDiscordConnection = NonNullable<AdminCommunityGetResult['discordConnection']>

export function getAdminCommunityGetQueryOptions(organizationId: string) {
  return orpc.adminOrganization.get.queryOptions({
    enabled: Boolean(organizationId),
    input: {
      organizationId,
    },
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
