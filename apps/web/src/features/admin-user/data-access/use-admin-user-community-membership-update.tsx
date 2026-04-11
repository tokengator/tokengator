import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminUserInvalidation } from './use-admin-user-invalidation'

export function useAdminUserCommunityMembershipUpdate(userId: string) {
  const adminUser = useAdminUserInvalidation()

  return useMutation(
    orpc.adminUser.updateCommunityMembership.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await adminUser.invalidateUserCommunities(userId)
        toast.success('Membership updated.')
      },
    }),
  )
}
