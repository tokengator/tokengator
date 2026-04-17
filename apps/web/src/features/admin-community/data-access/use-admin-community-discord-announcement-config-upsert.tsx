import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminCommunityDiscordInvalidation } from './use-admin-community-discord-invalidation'

export function useAdminCommunityDiscordAnnouncementConfigUpsert(organizationId: string) {
  const discord = useAdminCommunityDiscordInvalidation()

  return useMutation(
    orpc.adminOrganization.upsertDiscordAnnouncementConfig.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await discord.invalidateAnnouncements(organizationId)
        toast.success('Discord announcement channel saved.')
      },
    }),
  )
}
