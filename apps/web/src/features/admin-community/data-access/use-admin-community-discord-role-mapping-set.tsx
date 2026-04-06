import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'
import { useAdminCommunityDiscordInvalidation } from './use-admin-community-discord-invalidation'
import { useAdminCommunityRoleInvalidation } from './use-admin-community-role-invalidation'

export function useAdminCommunityDiscordRoleMappingSet(organizationId: string) {
  const discord = useAdminCommunityDiscordInvalidation()
  const role = useAdminCommunityRoleInvalidation()

  return useMutation(
    orpc.adminCommunityRole.setDiscordRoleMapping.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (result, variables) => {
        await Promise.all([discord.invalidateGuildRoles(organizationId), role.invalidateRoleCatalog(organizationId)])
        toast.success(
          result.mapping.status === 'ready'
            ? 'Discord role mapping saved.'
            : variables.discordRoleId === null
              ? 'Discord role mapping cleared.'
              : 'Discord role mapping saved. Check diagnostics before syncing Discord roles.',
        )
      },
    }),
  )
}
