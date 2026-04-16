import { queryOptions, useQuery } from '@tanstack/react-query'
import type { CommunityCollectionAssetDetailEntity } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'
import type { CommunityCollectionAssetServerFnResult } from './get-community-collection-asset-fn'

export interface CommunityCollectionAssetInput {
  address: string
  asset: string
  slug: string
}

export function getCommunityCollectionAssetQueryKey(input: CommunityCollectionAssetInput) {
  return orpc.community.getCollectionAsset.key({
    input: {
      address: input.address,
      asset: input.asset,
      slug: input.slug,
    },
  })
}

export function getCommunityCollectionAssetQueryOptions(input: CommunityCollectionAssetInput) {
  return queryOptions<CommunityCollectionAssetDetailEntity>({
    enabled: Boolean(input.address) && Boolean(input.asset) && Boolean(input.slug),
    queryFn: () =>
      orpc.community.getCollectionAsset.call({
        address: input.address,
        asset: input.asset,
        slug: input.slug,
      }),
    queryKey: getCommunityCollectionAssetQueryKey(input),
  })
}

export function getCommunityCollectionAssetRouteQueryOptions(input: CommunityCollectionAssetInput) {
  return queryOptions<CommunityCollectionAssetServerFnResult>({
    enabled: Boolean(input.address) && Boolean(input.asset) && Boolean(input.slug),
    queryFn: async () =>
      await import('./get-community-collection-asset-fn').then(({ getCommunityCollectionAsset }) =>
        getCommunityCollectionAsset({
          data: {
            address: input.address,
            asset: input.asset,
            slug: input.slug,
          },
        }),
      ),
    queryKey: getCommunityCollectionAssetQueryKey(input),
  })
}

export function useCommunityCollectionAssetQuery(
  input: CommunityCollectionAssetInput,
  options?: {
    initialData?: CommunityCollectionAssetDetailEntity
  },
) {
  return useQuery({
    ...getCommunityCollectionAssetQueryOptions(input),
    initialData: options?.initialData,
  })
}
