import { queryOptions, useQuery } from '@tanstack/react-query'
import type { ProfileListCommunitiesByUsernameResult } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

import { getProfileCommunitiesByUsername } from './get-profile-communities-by-username-fn'

function isNotFoundError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'NOT_FOUND'
}

async function getProfileCommunitiesByUsernameOrNull(
  query: () => Promise<ProfileListCommunitiesByUsernameResult | null>,
) {
  try {
    return await query()
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export function getProfileCommunitiesByUsernameQueryKey(username: string) {
  return orpc.profile.listCommunitiesByUsername.key({
    input: {
      username,
    },
  })
}

export function getProfileCommunitiesByUsernameQueryOptions(username: string) {
  return queryOptions({
    enabled: Boolean(username),
    queryFn: () =>
      getProfileCommunitiesByUsernameOrNull(() => orpc.profile.listCommunitiesByUsername.call({ username })),
    queryKey: getProfileCommunitiesByUsernameQueryKey(username),
    staleTime: 0,
  })
}

export function getProfileCommunitiesByUsernameRouteQueryOptions(username: string) {
  return queryOptions({
    enabled: Boolean(username),
    queryFn: () =>
      getProfileCommunitiesByUsernameOrNull(() =>
        getProfileCommunitiesByUsername({
          data: {
            username,
          },
        }),
      ),
    queryKey: getProfileCommunitiesByUsernameQueryKey(username),
    staleTime: 0,
  })
}

export function useProfileCommunitiesByUsernameQuery(
  username: string,
  options?: {
    initialData?: ProfileListCommunitiesByUsernameResult | null
  },
) {
  return useQuery({
    ...getProfileCommunitiesByUsernameQueryOptions(username),
    initialData: options?.initialData,
  })
}
