import { queryOptions, useQuery } from '@tanstack/react-query'
import type { ProfileUserEntity } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

import { getProfileByUsername } from './get-profile-by-username-fn'

function isNotFoundError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'NOT_FOUND'
}

async function getProfileByUsernameOrNull(query: () => Promise<ProfileUserEntity | null>) {
  try {
    return await query()
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export function getProfileByUsernameQueryKey(username: string) {
  return orpc.profile.getByUsername.key({
    input: {
      username,
    },
  })
}

export function getProfileByUsernameQueryOptions(username: string) {
  return queryOptions({
    enabled: Boolean(username),
    queryFn: () => getProfileByUsernameOrNull(() => orpc.profile.getByUsername.call({ username })),
    queryKey: getProfileByUsernameQueryKey(username),
    staleTime: 0,
  })
}

export function getProfileByUsernameRouteQueryOptions(username: string) {
  return queryOptions({
    enabled: Boolean(username),
    queryFn: () =>
      getProfileByUsernameOrNull(() =>
        getProfileByUsername({
          data: {
            username,
          },
        }),
      ),
    queryKey: getProfileByUsernameQueryKey(username),
    staleTime: 0,
  })
}

export function useProfileByUsernameQuery(
  username: string,
  options?: {
    initialData?: ProfileUserEntity | null
  },
) {
  return useQuery({
    ...getProfileByUsernameQueryOptions(username),
    initialData: options?.initialData,
  })
}
