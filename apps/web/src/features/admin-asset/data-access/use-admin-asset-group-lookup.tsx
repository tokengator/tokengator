import { useMutation } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useAdminAssetGroupLookup() {
  return useMutation(orpc.adminAssetGroup.lookup.mutationOptions())
}
