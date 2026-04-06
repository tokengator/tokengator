import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminCommunityOrganizationInvalidation } from './use-admin-community-organization-invalidation'

export function useAdminCommunityDirectoryCreate() {
  const organization = useAdminCommunityOrganizationInvalidation()

  return useMutation(
    orpc.adminOrganization.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await organization.invalidateDirectory()
        toast.success('Community created.')
      },
    }),
  )
}
