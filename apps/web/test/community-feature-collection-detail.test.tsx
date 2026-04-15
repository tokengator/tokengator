import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { CommunityGetBySlugResult } from '@tokengator/sdk'

describe('CommunityFeatureCollectionDetail', () => {
  test('renders a not found card when the collection address is not linked to the community', async () => {
    const { CommunityFeatureCollectionDetail } =
      await import('../src/features/community/feature/community-feature-collection-detail')
    const community = {
      collections: [
        {
          address: 'collection-alpha',
          facetTotals: {},
          id: 'collection-1',
          imageUrl: null,
          label: 'Alpha Collection',
          type: 'collection',
        },
      ],
      id: 'org-1',
      logo: null,
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    } satisfies CommunityGetBySlugResult
    const markup = renderToStaticMarkup(
      <CommunityFeatureCollectionDetail
        address="collection-missing"
        initialCollectionAssets={null}
        initialCommunity={community}
        search={{
          facets: undefined,
          grid: 4,
          owner: undefined,
          query: undefined,
        }}
      />,
    )

    expect(markup).toContain('Collection Not Found')
    expect(markup).toContain('not linked to this community')
  })
})
