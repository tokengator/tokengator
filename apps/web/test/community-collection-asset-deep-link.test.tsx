import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let CommunityCollectionAssetDialogContent: typeof import('../src/features/community/feature/community-feature-collection-asset-dialog').CommunityCollectionAssetDialogContent
let CommunityFeatureCollectionDetail: typeof import('../src/features/community/feature/community-feature-collection-detail').CommunityFeatureCollectionDetail
let CommunityFeatureCollectionAssets: typeof import('../src/features/community/feature/community-feature-collection-assets').CommunityFeatureCollectionAssets

const communityCollectionAssetsQueryMock = {
  getCommunityCollectionAssetsQueryKey: (input: unknown) => ['collection-assets', input],
  getCommunityCollectionAssetsQueryOptions: (input: unknown) => ({
    input,
    queryKey: ['collection-assets'],
  }),
  getCommunityCollectionAssetsRouteQueryOptions: (input: unknown) => ({
    input,
    queryKey: ['collection-assets'],
  }),
  useCommunityCollectionAssetsQuery: (_input: unknown, options?: { initialData?: unknown }) => ({
    data: options?.initialData,
    error: null,
    isPending: false,
  }),
}

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children, className, to }: { children?: ReactNode; className?: string; to?: string }) => (
      <a className={className} data-to={to}>
        {children}
      </a>
    ),
    useLocation: () => ({
      pathname: '/communities/alpha-dao/collections/collection-alpha/asset/asset-alpha',
    }),
    useNavigate: () => () => Promise.resolve(),
  }))
  mock.module(
    '../src/features/community/data-access/use-community-collection-assets-query',
    () => communityCollectionAssetsQueryMock,
  )
  mock.module(
    '../src/features/community/data-access/use-community-collection-assets-query.tsx',
    () => communityCollectionAssetsQueryMock,
  )
  mock.module('../src/features/community/data-access/use-community-collection-owner-candidates-query', () => ({
    useCommunityCollectionOwnerCandidatesQuery: () => ({
      data: [],
      isPending: false,
    }),
  }))

  ;({ CommunityCollectionAssetDialogContent } =
    await import('../src/features/community/feature/community-feature-collection-asset-dialog'))
  ;({ CommunityFeatureCollectionAssets } =
    await import('../src/features/community/feature/community-feature-collection-assets'))
  ;({ CommunityFeatureCollectionDetail } =
    await import('../src/features/community/feature/community-feature-collection-detail'))
})

afterAll(() => {
  mock.restore()
})

describe('community collection asset deep-link composition', () => {
  test('keeps the collection page rendered underneath the open asset dialog state', () => {
    const community = {
      collections: [
        {
          address: 'collection-alpha',
          assetMarketplace: {
            assetGroupId: 'collection-1',
            enabled: false as const,
            unavailableReason: 'api-key-missing' as const,
          },
          facetTotals: {},
          id: 'collection-1',
          imageUrl: 'https://api.dicebear.com/9.x/glass/svg?seed=asset-group%3Acollection-1',
          label: 'Alpha Collection',
          symbolMagicEden: null,
          type: 'collection' as const,
        },
      ],
      id: 'org-1',
      logo: null,
      marketplace: {
        magicEden: {
          enabled: false,
          unavailableReason: 'api-key-missing' as const,
        },
      },
      name: 'Alpha DAO',
      roles: [],
      slug: 'alpha-dao',
    }
    const collectionAssets = {
      assets: [
        {
          address: 'asset-alpha',
          id: 'asset-1',
          metadataImageUrl: 'https://example.com/asset-alpha.png',
          metadataName: 'Perk #1',
          metadataSymbol: 'PERK',
          owner: 'owner-alpha',
          traits: [],
        },
      ],
      facetTotals: {},
    }

    const markup = renderToStaticMarkup(
      <>
        <CommunityFeatureCollectionDetail
          address="collection-alpha"
          initialCommunity={community}
          search={{
            facets: undefined,
            grid: 8,
            owner: undefined,
            query: undefined,
          }}
        >
          <CommunityFeatureCollectionAssets
            initialCollectionAssets={collectionAssets}
            search={{
              facets: undefined,
              grid: 8,
              owner: undefined,
              query: undefined,
            }}
            selectedCollection={community.collections[0]!}
            slug={community.slug}
          />
        </CommunityFeatureCollectionDetail>
        <CommunityCollectionAssetDialogContent
          asset={{
            address: 'asset-alpha',
            id: 'asset-1',
            metadataImageUrl: 'https://example.com/asset-alpha.png',
            metadataJson: {
              name: 'Perk #1',
            },
            metadataJsonUrl: 'https://example.com/asset-alpha.json',
            metadataName: 'Perk #1',
            metadataSymbol: 'PERK',
            owner: 'owner-alpha',
            traits: [],
          }}
          assetAddress="asset-alpha"
          assets={collectionAssets.assets}
          onClose={() => {}}
          onNavigateToAsset={() => {}}
          selectedCollection={community.collections[0]!}
        />
      </>,
    )

    expect(markup).toContain('Search')
    expect(markup).toContain('Alpha Collection')
    expect(markup).toContain('Perk #1')
    expect(markup).toContain('Back to collection')
    expect(markup).toContain('JSON Metadata')
  })
})
