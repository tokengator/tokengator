import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminUserInvalidation } from './use-admin-user-invalidation'

export function useAdminUserUpdate(userId: string) {
  const adminUser = useAdminUserInvalidation()

  return useMutation(
    orpc.adminUser.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await adminUser.invalidateUserAndDirectory(userId)
        toast.success('User updated.')
      },
    }),
  )
}
