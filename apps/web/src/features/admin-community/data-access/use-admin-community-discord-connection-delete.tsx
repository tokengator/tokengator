import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'

export function useAdminCommunityDiscordConnectionDelete(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminOrganization.deleteDiscordConnection.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.adminCommunityRole.listDiscordGuildRoles.key({
              input: {
                organizationId,
              },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.adminOrganization.get.key({
              input: {
                organizationId,
              },
            }),
          }),
        ])
        toast.success('Discord server disconnected.')
      },
    }),
  )
}
