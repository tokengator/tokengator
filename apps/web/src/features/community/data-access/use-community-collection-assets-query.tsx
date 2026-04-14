import { queryOptions, useQuery } from '@tanstack/react-query'
import type { CommunityListCollectionAssetsResult } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

export interface CommunityCollectionAssetsInput {
  address: string
  owner?: string
  query?: string
  slug: string
}

function isNotFoundError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'NOT_FOUND'
}

async function getCommunityCollectionAssetsOrNull(query: () => Promise<CommunityListCollectionAssetsResult | null>) {
  try {
    return await query()
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export function getCommunityCollectionAssetsQueryKey(input: CommunityCollectionAssetsInput) {
  return orpc.community.listCollectionAssets.key({
    input: {
      address: input.address,
      owner: input.owner,
      query: input.query,
      slug: input.slug,
    },
  })
}

export function getCommunityCollectionAssetsQueryOptions(input: CommunityCollectionAssetsInput) {
  return queryOptions({
    enabled: Boolean(input.address) && Boolean(input.slug),
    queryFn: () =>
      getCommunityCollectionAssetsOrNull(() =>
        orpc.community.listCollectionAssets.call({
          address: input.address,
          owner: input.owner,
          query: input.query,
          slug: input.slug,
        }),
      ),
    queryKey: getCommunityCollectionAssetsQueryKey(input),
  })
}

export function getCommunityCollectionAssetsRouteQueryOptions(input: CommunityCollectionAssetsInput) {
  return queryOptions({
    enabled: Boolean(input.address) && Boolean(input.slug),
    queryFn: async () =>
      getCommunityCollectionAssetsOrNull(() =>
        import('./get-community-collection-assets-fn').then(({ getCommunityCollectionAssets }) =>
          getCommunityCollectionAssets({
            data: {
              address: input.address,
              owner: input.owner,
              query: input.query,
              slug: input.slug,
            },
          }),
        ),
      ),
    queryKey: getCommunityCollectionAssetsQueryKey(input),
  })
}

export function useCommunityCollectionAssetsQuery(
  input: CommunityCollectionAssetsInput,
  options?: {
    initialData?: CommunityListCollectionAssetsResult | null
  },
) {
  return useQuery({
    ...getCommunityCollectionAssetsQueryOptions(input),
    initialData: options?.initialData,
  })
}
