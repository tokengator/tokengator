import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminCommunityDiscordInvalidation } from './use-admin-community-discord-invalidation'

export function useAdminCommunityDiscordAnnouncementEnabledSet(organizationId: string) {
  const discord = useAdminCommunityDiscordInvalidation()

  return useMutation(
    orpc.adminOrganization.setDiscordAnnouncementEnabled.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (_config, input) => {
        await discord.invalidateAnnouncements(organizationId)
        toast.success(input.enabled ? 'Discord announcement enabled.' : 'Discord announcement disabled.')
      },
    }),
  )
}
