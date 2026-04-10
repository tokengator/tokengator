import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'

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
