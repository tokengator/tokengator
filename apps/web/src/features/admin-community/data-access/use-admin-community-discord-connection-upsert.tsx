import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/utils/orpc'

export function useAdminCommunityDiscordConnectionUpsert(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.adminOrganization.upsertDiscordConnection.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.get.key({
            input: {
              organizationId,
            },
          }),
        })
        toast.success('Discord server saved.')
      },
    }),
  )
}
