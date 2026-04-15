import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
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

  test('renders the collection grid with images and placeholders', () => {
    community = {
      collections: [
        {
          address: 'collection-alpha',
          facetTotals: {},
          id: 'collection-1',
          imageUrl: 'https://example.com/collection-alpha.png',
          label: 'Alpha Collection',
          type: 'collection',
        },
        {
          address: 'collection-beta',
          facetTotals: {},
          id: 'collection-2',
          imageUrl: null,
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
    expect(markup).toContain('https://example.com/collection-alpha.png')
    expect(markup).toContain('aspect-square')
    expect(markup).toContain('data-address="collection-alpha"')
    expect(markup).toContain('data-slug="alpha-dao"')
    expect(markup).toContain('/communities/$slug/collections/$address')
    expect(markup).toContain('data-slot="skeleton"')
  })
})
