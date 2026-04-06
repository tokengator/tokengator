import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminCommunityDiscordInvalidation } from './use-admin-community-discord-invalidation'

export function useAdminCommunityDiscordConnectionRefresh(organizationId: string) {
  const discord = useAdminCommunityDiscordInvalidation()

  return useMutation(
    orpc.adminOrganization.refreshDiscordConnection.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await discord.invalidateConnection(organizationId)
        toast.success('Discord server status refreshed.')
      },
    }),
  )
}
