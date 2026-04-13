import { queryOptions, useQuery } from '@tanstack/react-query'
import type { CommunityGetBySlugResult } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

import { getCommunityBySlug } from './get-community-by-slug-fn'

function isNotFoundError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'NOT_FOUND'
}

async function getCommunityBySlugOrNull(query: () => Promise<CommunityGetBySlugResult | null>) {
  try {
    return await query()
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export function getCommunityBySlugQueryKey(slug: string) {
  return orpc.community.getBySlug.key({
    input: {
      slug,
    },
  })
}

export function getCommunityBySlugQueryOptions(slug: string) {
  return queryOptions({
    enabled: Boolean(slug),
    queryFn: () => getCommunityBySlugOrNull(() => orpc.community.getBySlug.call({ slug })),
    queryKey: getCommunityBySlugQueryKey(slug),
  })
}

export function getCommunityBySlugRouteQueryOptions(slug: string) {
  return queryOptions({
    enabled: Boolean(slug),
    queryFn: () =>
      getCommunityBySlugOrNull(() =>
        getCommunityBySlug({
          data: {
            slug,
          },
        }),
      ),
    queryKey: getCommunityBySlugQueryKey(slug),
  })
}

export function useCommunityBySlugQuery(
  slug: string,
  options?: {
    initialData?: CommunityGetBySlugResult | null
  },
) {
  return useQuery({
    ...getCommunityBySlugQueryOptions(slug),
    initialData: options?.initialData,
  })
}
