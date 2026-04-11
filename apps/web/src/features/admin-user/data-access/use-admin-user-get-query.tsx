import { queryOptions, useQuery } from '@tanstack/react-query'
import type { AdminUserDetailEntity } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'
import { getAdminUser } from './get-admin-user-fn'

function isNotFoundError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'NOT_FOUND'
}

async function getAdminUserOrNull(query: () => Promise<AdminUserDetailEntity>) {
  try {
    return await query()
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export function getAdminUserGetQueryKey(userId: string) {
  return orpc.adminUser.get.key({
    input: {
      userId,
    },
  })
}

export function getAdminUserGetQueryOptions(userId: string) {
  return queryOptions({
    enabled: Boolean(userId),
    queryFn: () => getAdminUserOrNull(() => orpc.adminUser.get.call({ userId })),
    queryKey: getAdminUserGetQueryKey(userId),
  })
}

export function getAdminUserGetRouteQueryOptions(userId: string) {
  return queryOptions({
    enabled: Boolean(userId),
    queryFn: () =>
      getAdminUserOrNull(() =>
        getAdminUser({
          data: {
            userId,
          },
        }),
      ),
    queryKey: getAdminUserGetQueryKey(userId),
  })
}

export function useAdminUserGetQuery(
  userId: string,
  options?: {
    initialData?: AdminUserDetailEntity | null
  },
) {
  return useQuery({
    ...getAdminUserGetQueryOptions(userId),
    initialData: options?.initialData,
  })
}
