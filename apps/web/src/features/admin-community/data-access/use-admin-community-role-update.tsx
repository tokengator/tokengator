import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminCommunityRoleInvalidation } from './use-admin-community-role-invalidation'

export function useAdminCommunityRoleUpdate(organizationId: string) {
  const role = useAdminCommunityRoleInvalidation()

  return useMutation(
    orpc.adminCommunityRole.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await role.invalidateRoleCatalog(organizationId)
        toast.success('Community role updated.')
      },
    }),
  )
}
