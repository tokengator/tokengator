import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'

import type { AdminCommunityMembershipSyncResult } from './use-admin-community-membership-sync-apply'

export type { AdminCommunityMembershipSyncResult }

export function useAdminCommunityMembershipSyncPreview() {
  return useMutation(
    orpc.adminCommunityRole.previewSync.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: () => {
        toast.success('Access preview updated.')
      },
    }),
  )
}
