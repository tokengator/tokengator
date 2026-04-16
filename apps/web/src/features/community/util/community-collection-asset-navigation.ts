import type { CommunityCollectionAssetEntity } from '@tokengator/sdk'

import type { CommunityCollectionAssetSearch } from './community-collection-asset-search'

export type CommunityCollectionAssetNavigation = {
  params: {
    address: string
    asset: string
    slug: string
  }
  search: CommunityCollectionAssetSearch
  to: '/communities/$slug/collections/$address/asset/$asset'
}

export type CommunityCollectionNavigation = {
  params: {
    address: string
    slug: string
  }
  search: CommunityCollectionAssetSearch
  to: '/communities/$slug/collections/$address'
}

function getCommunityCollectionAssetNavigationSearch(
  search: CommunityCollectionAssetSearch,
): CommunityCollectionAssetSearch {
  return {
    facets: search.facets,
    grid: search.grid,
    owner: search.owner,
    query: search.query,
  }
}

export function getCommunityCollectionAssetNavigation(input: {
  address: string
  asset: string
  search: CommunityCollectionAssetSearch
  slug: string
}): CommunityCollectionAssetNavigation {
  return {
    params: {
      address: input.address,
      asset: input.asset,
      slug: input.slug,
    },
    search: getCommunityCollectionAssetNavigationSearch(input.search),
    to: '/communities/$slug/collections/$address/asset/$asset',
  }
}

export function getCommunityCollectionNavigation(input: {
  address: string
  search: CommunityCollectionAssetSearch
  slug: string
}): CommunityCollectionNavigation {
  return {
    params: {
      address: input.address,
      slug: input.slug,
    },
    search: getCommunityCollectionAssetNavigationSearch(input.search),
    to: '/communities/$slug/collections/$address',
  }
}

export function getCommunityCollectionAssetSiblingAddresses(input: {
  asset: string
  assets: CommunityCollectionAssetEntity[]
}) {
  const currentIndex = input.assets.findIndex((currentAsset) => currentAsset.address === input.asset)

  if (currentIndex === -1) {
    return {
      nextAssetAddress: undefined,
      previousAssetAddress: undefined,
    }
  }

  return {
    nextAssetAddress: input.assets[currentIndex + 1]?.address,
    previousAssetAddress: currentIndex > 0 ? input.assets[currentIndex - 1]?.address : undefined,
  }
}
