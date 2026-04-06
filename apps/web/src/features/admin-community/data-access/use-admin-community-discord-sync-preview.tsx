import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'

import type { AdminCommunityDiscordSyncResult } from './admin-community-role-types'

export type { AdminCommunityDiscordSyncResult }

export function useAdminCommunityDiscordSyncPreview() {
  return useMutation(
    orpc.adminCommunityRole.previewDiscordRoleSync.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: () => {
        toast.success('Discord role preview updated.')
      },
    }),
  )
}
