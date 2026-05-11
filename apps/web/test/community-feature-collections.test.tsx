import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CommunityGetBySlugResult } from '@tokengator/sdk'

let community: CommunityGetBySlugResult = {
  collections: [],
  id: 'org-1',
  logo: 'https://example.com/community.png',
  marketplace: {
    magicEden: {
      enabled: false,
      unavailableReason: 'api-key-missing',
    },
  },
  name: 'Alpha DAO',
  roles: [],
  slug: 'alpha-dao',
}

let CommunityFeatureCollections: typeof import('../src/features/community/feature/community-feature-collections').CommunityFeatureCollections

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({
      children,
      className,
      params,
      to,
    }: {
      children?: ReactNode
      className?: string
      params?: Record<string, string>
      to?: string
    }) => (
      <a className={className} data-address={params?.address} data-slug={params?.slug} data-to={to}>
        {children}
      </a>
    ),
  }))

  mock.module('../src/features/community/data-access/use-community-by-slug-query', () => ({
    getCommunityBySlugQueryKey: (slug: string) => ['community', slug],
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
      marketplace: {
        magicEden: {
          enabled: false,
          unavailableReason: 'api-key-missing',
        },
      },
      name: 'Alpha DAO',
      roles: [],
      slug: 'alpha-dao',
    }

    const markup = renderToStaticMarkup(<CommunityFeatureCollections initialCommunity={community} />)

    expect(markup).toContain('Collections')
    expect(markup).toContain('No collections are linked to this community yet.')
  })

  test('renders the collection grid with images', () => {
    community = {
      collections: [
        {
          address: 'collection-alpha',
          assetMarketplace: {
            assetGroupId: 'collection-1',
            enabled: false,
            unavailableReason: 'api-key-missing',
          },
          facetTotals: {},
          id: 'collection-1',
          imageUrl: 'https://example.com/collection-alpha.png',
          label: 'Alpha Collection',
          symbolMagicEden: null,
          type: 'collection',
        },
        {
          address: 'collection-beta',
          assetMarketplace: {
            assetGroupId: 'collection-2',
            enabled: false,
            unavailableReason: 'api-key-missing',
          },
          facetTotals: {},
          id: 'collection-2',
          imageUrl: 'https://api.dicebear.com/9.x/glass/svg?seed=asset-group%3Acollection-2',
          label: 'Beta Collection',
          symbolMagicEden: null,
          type: 'collection',
        },
      ],
      id: 'org-1',
      logo: 'https://example.com/community.png',
      marketplace: {
        magicEden: {
          enabled: false,
          unavailableReason: 'api-key-missing',
        },
      },
      name: 'Alpha DAO',
      roles: [],
      slug: 'alpha-dao',
    }

    const markup = renderToStaticMarkup(<CommunityFeatureCollections initialCommunity={community} />)

    expect(markup).toContain('Alpha Collection')
    expect(markup).toContain('Beta Collection')
    expect(markup).toContain('https://example.com/collection-alpha.png')
    expect(markup).toContain('https://api.dicebear.com/9.x/glass/svg?seed=asset-group%3Acollection-2')
    expect(markup).toContain('aspect-square')
    expect(markup).toContain('data-address="collection-alpha"')
    expect(markup).toContain('data-slug="alpha-dao"')
    expect(markup).toContain('/communities/$slug/collections/$address')
  })
})
