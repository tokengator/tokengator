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

let CommunityFeatureOverview: typeof import('../src/features/community/feature/community-feature-overview').CommunityFeatureOverview

function getMockLinkHref(input: { params?: Record<string, string>; search?: Record<string, unknown>; to: string }) {
  let href = input.to

  for (const [key, value] of Object.entries(input.params ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
    href = href.replace(`$${key}`, value)
  }

  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(input.search ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
    if (value === undefined) {
      continue
    }

    searchParams.set(key, String(value))
  }

  const search = searchParams.toString()

  return search ? `${href}?${search}` : href
}

function getExpectedAssetGroupImageUrl(id: string) {
  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(`asset-group:${id}`)}`
}

function MockLink({
  children,
  className,
  params,
  search,
  to,
}: {
  children: ReactNode
  className?: string
  params?: Record<string, string>
  search?: Record<string, unknown>
  to: string
}) {
  return (
    <a className={className} href={getMockLinkHref({ params, search, to })}>
      {children}
    </a>
  )
}

function createCommunityWithRoles(): CommunityGetBySlugResult {
  return {
    collections: [
      {
        address: 'collection-alpha',
        assetMarketplace: {
          assetGroupId: 'asset-group-alpha',
          enabled: true,
          unavailableReason: null,
        },
        facetTotals: {},
        id: 'asset-group-alpha',
        imageUrl: 'https://example.com/collection-alpha.png',
        label: 'Alpha Pass',
        symbolMagicEden: 'alpha-symbol',
        type: 'collection',
      },
    ],
    id: 'org-1',
    logo: 'https://example.com/community.png',
    marketplace: {
      magicEden: {
        enabled: true,
        unavailableReason: null,
      },
    },
    name: 'Alpha DAO',
    roles: [
      {
        assetGroups: [
          {
            address: 'collection-alpha',
            id: 'asset-group-alpha',
            imageUrl: 'https://example.com/collection-alpha.png',
            label: 'Alpha Pass',
            maximumAmount: null,
            minimumAmount: '1',
            resolverKind: 'helius-collection-assets',
            symbolMagicEden: 'alpha-symbol',
            type: 'collection',
          },
          {
            address: 'mint-beta',
            id: 'asset-group-beta',
            imageUrl: getExpectedAssetGroupImageUrl('asset-group-beta'),
            label: 'Beta Token',
            maximumAmount: '100',
            minimumAmount: '5',
            resolverKind: 'helius-token-accounts',
            symbolMagicEden: null,
            type: 'mint',
          },
        ],
        assigned: false,
        assignedAssetGroups: [],
        id: 'role-founders',
        matchMode: 'all',
        name: 'Founders',
        slug: 'founders',
      },
      {
        assetGroups: [
          {
            address: 'mint-beta',
            id: 'asset-group-beta',
            imageUrl: getExpectedAssetGroupImageUrl('asset-group-beta'),
            label: 'Beta Token',
            maximumAmount: null,
            minimumAmount: '1',
            resolverKind: 'helius-token-accounts',
            symbolMagicEden: null,
            type: 'mint',
          },
        ],
        assigned: true,
        assignedAssetGroups: [
          {
            address: 'mint-beta',
            id: 'asset-group-beta',
            imageUrl: getExpectedAssetGroupImageUrl('asset-group-beta'),
            label: 'Beta Token',
            maximumAmount: null,
            minimumAmount: '1',
            resolverKind: 'helius-token-accounts',
            symbolMagicEden: null,
            type: 'mint',
          },
        ],
        id: 'role-members',
        matchMode: 'any',
        name: 'Members',
        slug: 'members',
      },
      {
        assetGroups: [
          {
            address: 'collection-alpha',
            id: 'asset-group-alpha',
            imageUrl: 'https://example.com/collection-alpha.png',
            label: 'Alpha Pass',
            maximumAmount: '10',
            minimumAmount: '2',
            resolverKind: 'helius-collection-assets',
            symbolMagicEden: 'alpha-symbol',
            type: 'collection',
          },
          {
            address: 'mint-beta',
            id: 'asset-group-beta',
            imageUrl: getExpectedAssetGroupImageUrl('asset-group-beta'),
            label: 'Beta Token',
            maximumAmount: null,
            minimumAmount: '1',
            resolverKind: 'helius-token-accounts',
            symbolMagicEden: null,
            type: 'mint',
          },
        ],
        assigned: false,
        assignedAssetGroups: [],
        id: 'role-supporters',
        matchMode: 'any',
        name: 'Supporters',
        slug: 'supporters',
      },
    ],
    slug: 'alpha-dao',
  }
}

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: MockLink,
  }))

  mock.module('../src/features/community/data-access/use-community-by-slug-query', () => ({
    getCommunityBySlugQueryKey: (slug: string) => ['community', slug],
    useCommunityBySlugQuery: () => ({
      data: community,
    }),
  }))

  ;({ CommunityFeatureOverview } = await import('../src/features/community/feature/community-feature-overview'))
})

afterAll(() => {
  mock.restore()
})

describe('CommunityFeatureOverview', () => {
  test('renders empty states when there are no public token-gated roles or assets', () => {
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

    const markup = renderToStaticMarkup(<CommunityFeatureOverview initialCommunity={community} />)

    expect(markup).toContain('Assigned')
    expect(markup).toContain('0 assigned')
    expect(markup).toContain('No assigned roles yet.')
    expect(markup).toContain('Available')
    expect(markup).toContain('0 available')
    expect(markup).toContain('No available roles yet.')
    expect(markup).toContain('Assets')
    expect(markup).toContain('0 linked')
    expect(markup).toContain('No token-gated assets yet.')
  })

  test('renders assigned rows, available role accordions, and a de-duped linked asset panel', () => {
    community = createCommunityWithRoles()

    const markup = renderToStaticMarkup(<CommunityFeatureOverview initialCommunity={community} />)
    const collectionLinks = markup.match(/href="\/communities\/alpha-dao\/collections\/collection-alpha\?grid=8"/g)

    expect(markup).toContain('1 assigned')
    expect(markup).toContain('2 available')
    expect(markup).toContain('2 linked')
    expect(markup).toContain('Assigned')
    expect(markup).toContain('Available')
    expect(markup).toContain('Founders')
    expect(markup).toContain('Members')
    expect(markup).toContain('Supporters')
    expect(markup).toContain('Requires all requirements')
    expect(markup).toContain('Requires any requirement')
    expect(markup).toContain('Mint: Beta Token')
    expect(markup).toContain('Collection - collection-alpha')
    expect(markup).toContain('Mint - mint-beta')
    expect(markup.match(/Buy NFT/g)?.length ?? 0).toBe(1)
    expect(markup).toContain(getExpectedAssetGroupImageUrl('asset-group-beta').replaceAll('&', '&amp;'))
    expect(markup).toContain('https://example.com/collection-alpha.png')
    expect(collectionLinks?.length).toBe(1)
    expect(markup).not.toContain('Requirement: Min 1+')
    expect(markup).not.toContain('Requirement: Min 2 &amp; Max 10')
    expect(markup).not.toContain('Requirement: Min 5 &amp; Max 100')
    expect(markup).not.toContain('data-value="available"')
    expect(markup).not.toContain('href="/communities/alpha-dao/collections/mint-beta?grid=8"')
  })
})
