import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminUserInvalidation } from './use-admin-user-invalidation'

export function useAdminUserCommunityMembershipRemove(userId: string) {
  const adminUser = useAdminUserInvalidation()

  return useMutation(
    orpc.adminUser.removeCommunityMembership.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await adminUser.invalidateUserCommunities(userId)
        toast.success('Membership removed.')
      },
    }),
  )
}
