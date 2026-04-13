import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CommunityGetBySlugResult } from '@tokengator/sdk'

let community: CommunityGetBySlugResult = {
  collections: [],
  id: 'org-1',
  logo: 'https://example.com/community.png',
  name: 'Alpha DAO',
  slug: 'alpha-dao',
}

let CommunityFeatureCollections: typeof import('../src/features/community/feature/community-feature-collections').CommunityFeatureCollections

beforeAll(async () => {
  mock.module('../src/features/community/data-access/use-community-by-slug-query', () => ({
    useCommunityBySlugQuery: () => ({
      data: community,
    }),
  }))

  ;({ CommunityFeatureCollections } = await import('../src/features/community/feature/community-feature-collections'))
})

afterAll(() => {
  mock.restore()
})

describe('CommunityFeatureCollections', () => {
  test('renders the empty state when the community has no linked collections', () => {
    community = {
      collections: [],
      id: 'org-1',
      logo: 'https://example.com/community.png',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    }

    const markup = renderToStaticMarkup(<CommunityFeatureCollections initialCommunity={community} />)

    expect(markup).toContain('Collections')
    expect(markup).toContain('No collections are linked to this community yet.')
  })

  test('renders the collection grid with image placeholders', () => {
    community = {
      collections: [
        {
          address: 'collection-alpha',
          id: 'collection-1',
          label: 'Alpha Collection',
          type: 'collection',
        },
        {
          address: 'collection-beta',
          id: 'collection-2',
          label: 'Beta Collection',
          type: 'collection',
        },
      ],
      id: 'org-1',
      logo: 'https://example.com/community.png',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    }

    const markup = renderToStaticMarkup(<CommunityFeatureCollections initialCommunity={community} />)

    expect(markup).toContain('Alpha Collection')
    expect(markup).toContain('Beta Collection')
    expect(markup).toContain('aspect-[4/3]')
    expect(markup).toContain('data-slot="skeleton"')
  })
})
