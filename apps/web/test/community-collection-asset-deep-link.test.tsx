import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let CommunityCollectionAssetDialogContent: typeof import('../src/features/community/feature/community-feature-collection-asset-dialog').CommunityCollectionAssetDialogContent
let CommunityFeatureCollectionDetail: typeof import('../src/features/community/feature/community-feature-collection-detail').CommunityFeatureCollectionDetail

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children, className, to }: { children?: ReactNode; className?: string; to?: string }) => (
      <a className={className} data-to={to}>
        {children}
      </a>
    ),
    useNavigate: () => () => Promise.resolve(),
  }))
  mock.module('../src/features/community/data-access/use-community-collection-assets-query', () => ({
    useCommunityCollectionAssetsQuery: (_input: unknown, options?: { initialData?: unknown }) => ({
      data: options?.initialData,
      error: null,
      isPending: false,
    }),
  }))

  ;({ CommunityCollectionAssetDialogContent } =
    await import('../src/features/community/feature/community-feature-collection-asset-dialog'))
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
          facetTotals: {},
          id: 'collection-1',
          imageUrl: null,
          label: 'Alpha Collection',
          type: 'collection' as const,
        },
      ],
      id: 'org-1',
      logo: null,
      name: 'Alpha DAO',
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
          initialCollectionAssets={collectionAssets}
          initialCommunity={community}
          search={{
            facets: undefined,
            grid: 8,
            owner: undefined,
            query: undefined,
          }}
        />
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
