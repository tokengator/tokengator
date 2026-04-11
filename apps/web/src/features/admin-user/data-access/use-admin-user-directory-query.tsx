import { useQuery } from '@tanstack/react-query'
import type { AdminUserListInput } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

export function useAdminUserDirectoryQuery(input: { search?: NonNullable<AdminUserListInput>['search'] }) {
  return useQuery(
    orpc.adminUser.list.queryOptions({
      input: {
        search: input.search,
      },
    }),
  )
}
