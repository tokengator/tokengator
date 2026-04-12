import { queryOptions, useQuery } from '@tanstack/react-query'
import type { ProfileListIdentitiesByUsernameResult } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

import { getProfileIdentitiesByUsername } from './get-profile-identities-by-username-fn'

function isNotFoundError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'NOT_FOUND'
}

async function getProfileIdentitiesByUsernameOrNull(
  query: () => Promise<ProfileListIdentitiesByUsernameResult | null>,
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

export function getProfileIdentitiesByUsernameQueryKey(username: string) {
  return orpc.profile.listIdentitiesByUsername.key({
    input: {
      username,
    },
  })
}

export function getProfileIdentitiesByUsernameQueryOptions(username: string) {
  return queryOptions({
    enabled: Boolean(username),
    queryFn: () => getProfileIdentitiesByUsernameOrNull(() => orpc.profile.listIdentitiesByUsername.call({ username })),
    queryKey: getProfileIdentitiesByUsernameQueryKey(username),
    staleTime: 0,
  })
}

export function getProfileIdentitiesByUsernameRouteQueryOptions(username: string) {
  return queryOptions({
    enabled: Boolean(username),
    queryFn: () =>
      getProfileIdentitiesByUsernameOrNull(() =>
        getProfileIdentitiesByUsername({
          data: {
            username,
          },
        }),
      ),
    queryKey: getProfileIdentitiesByUsernameQueryKey(username),
    staleTime: 0,
  })
}

export function useProfileIdentitiesByUsernameQuery(
  username: string,
  options?: {
    initialData?: ProfileListIdentitiesByUsernameResult | null
  },
) {
  return useQuery({
    ...getProfileIdentitiesByUsernameQueryOptions(username),
    initialData: options?.initialData,
  })
}
