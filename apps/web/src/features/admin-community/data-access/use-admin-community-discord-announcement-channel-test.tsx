import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'

export function useAdminCommunityDiscordAnnouncementChannelTest() {
  return useMutation(
    orpc.adminOrganization.testDiscordAnnouncementChannel.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: () => {
        toast.success('Discord test message sent.')
      },
    }),
  )
}
