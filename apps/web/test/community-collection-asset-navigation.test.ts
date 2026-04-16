import { describe, expect, test } from 'bun:test'

import {
  getCommunityCollectionAssetNavigation,
  getCommunityCollectionAssetSiblingAddresses,
  getCommunityCollectionNavigation,
} from '../src/features/community/util/community-collection-asset-navigation'

describe('community collection asset navigation', () => {
  test('preserves the current collection search when closing the dialog or opening an asset', () => {
    const search = {
      facets: {
        background: ['forest'],
      },
      grid: 8 as const,
      owner: 'owner-beta',
      query: 'perk',
    }

    expect(
      getCommunityCollectionNavigation({
        address: 'collection-alpha',
        search,
        slug: 'alpha-dao',
      }),
    ).toEqual({
      params: {
        address: 'collection-alpha',
        slug: 'alpha-dao',
      },
      search,
      to: '/communities/$slug/collections/$address',
    })

    expect(
      getCommunityCollectionAssetNavigation({
        address: 'collection-alpha',
        asset: 'asset-beta',
        search,
        slug: 'alpha-dao',
      }),
    ).toEqual({
      params: {
        address: 'collection-alpha',
        asset: 'asset-beta',
        slug: 'alpha-dao',
      },
      search,
      to: '/communities/$slug/collections/$address/asset/$asset',
    })
  })

  test('finds previous and next asset addresses from the current filtered asset list', () => {
    expect(
      getCommunityCollectionAssetSiblingAddresses({
        asset: 'asset-beta',
        assets: [
          {
            address: 'asset-alpha',
            id: 'asset-1',
            metadataImageUrl: null,
            metadataName: 'Perk #1',
            metadataSymbol: 'PERK',
            owner: 'owner-alpha',
            traits: [],
          },
          {
            address: 'asset-beta',
            id: 'asset-2',
            metadataImageUrl: null,
            metadataName: 'Perk #2',
            metadataSymbol: 'PERK',
            owner: 'owner-beta',
            traits: [],
          },
          {
            address: 'asset-gamma',
            id: 'asset-3',
            metadataImageUrl: null,
            metadataName: 'Perk #3',
            metadataSymbol: 'PERK',
            owner: 'owner-gamma',
            traits: [],
          },
        ],
      }),
    ).toEqual({
      nextAssetAddress: 'asset-gamma',
      previousAssetAddress: 'asset-alpha',
    })
  })
})
