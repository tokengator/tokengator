import { describe, expect, test } from 'bun:test'

describe('CommunityFeatureCollectionAssets', () => {
  test('clears facets and text query when switching collections while preserving owner and grid', async () => {
    const { getCommunityCollectionSwitchNavigation } =
      await import('../src/features/community/feature/community-feature-collection-assets')

    expect(
      getCommunityCollectionSwitchNavigation({
        address: 'collection-beta',
        search: {
          facets: {
            background: ['forest'],
          },
          grid: 8,
          owner: 'owner-alpha',
          query: 'perk',
        },
        slug: 'alpha-dao',
      }),
    ).toEqual({
      params: {
        address: 'collection-beta',
        slug: 'alpha-dao',
      },
      search: {
        facets: undefined,
        grid: 8,
        owner: 'owner-alpha',
        query: undefined,
      },
      to: '/communities/$slug/collections/$address',
    })
  })
})
