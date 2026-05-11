import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CommunityGetBySlugResult } from '@tokengator/sdk'

let CommunityFeatureCollectionMarketplace: typeof import('../src/features/community/feature/community-feature-collection-marketplace').CommunityFeatureCollectionMarketplace

const listingsQueryCalls: unknown[] = []
const rootRouteMock = {
  Route: {
    useRouteContext: () => ({
      appAuthState: {
        solanaWallets: {
          solanaWallets: [],
        },
      },
      appConfig: {
        solanaCluster: 'devnet',
        solanaEndpoint: 'http://127.0.0.1:8899',
      },
    }),
  },
}

function createCommunity(options?: { marketplaceEnabled?: boolean }): CommunityGetBySlugResult {
  const marketplaceEnabled = options?.marketplaceEnabled ?? true
  const assetMarketplace = marketplaceEnabled
    ? ({
        assetGroupId: 'asset-group-alpha',
        enabled: true,
        unavailableReason: null,
      } as const)
    : ({
        assetGroupId: 'asset-group-alpha',
        enabled: false,
        unavailableReason: 'api-key-missing' as const,
      } as const)

  return {
    collections: [
      {
        address: 'collection-alpha',
        assetMarketplace,
        facetTotals: {},
        id: 'asset-group-alpha',
        imageUrl: 'https://example.com/collection-alpha.png',
        label: 'Alpha Collection',
        symbolMagicEden: 'alpha-symbol',
        type: 'collection',
      },
    ],
    id: 'community-alpha',
    logo: null,
    marketplace: {
      magicEden: {
        enabled: marketplaceEnabled,
        unavailableReason: marketplaceEnabled ? null : 'api-key-missing',
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
            label: 'Alpha Collection',
            maximumAmount: null,
            minimumAmount: '1',
            resolverKind: 'helius-collection-assets',
            symbolMagicEden: 'alpha-symbol',
            type: 'collection',
          },
        ],
        assigned: false,
        assignedAssetGroups: [],
        id: 'role-alpha',
        matchMode: 'any',
        name: 'Alpha Role',
        slug: 'alpha-role',
      },
    ],
    slug: 'alpha-dao',
  }
}

beforeAll(async () => {
  mock.module('@tokengator/wallet-ui', () => ({
    WalletDropdown: ({ children, className }: { children?: ReactNode; className?: string }) => (
      <button className={className} type="button">
        {children ?? 'Wallet'}
      </button>
    ),
  }))
  mock.module('@wallet-ui/react', () => ({
    ellipsify: (address: string) => `${address.slice(0, 4)}..${address.slice(-4)}`,
    useSignAndSendTransaction: () => async () => ({ signature: new Uint8Array([1]) }),
    useWalletUi: () => ({ account: null }),
  }))
  mock.module('@/lib/solana-provider', () => ({
    SolanaProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  }))
  mock.module('@/lib/solana-provider.tsx', () => ({
    SolanaProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  }))
  mock.module('@/routes/__root', () => rootRouteMock)
  mock.module('../src/lib/solana-provider', () => ({
    SolanaProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  }))
  mock.module('../src/lib/solana-provider.tsx', () => ({
    SolanaProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  }))
  mock.module('../src/routes/__root', () => rootRouteMock)
  mock.module('../src/features/community/data-access/use-community-asset-marketplace-listings-query', () => ({
    useCommunityAssetMarketplaceListingsQuery: (input: unknown) => {
      listingsQueryCalls.push(input)

      return {
        data: {
          assetGroup: {
            address: 'collection-alpha',
            id: 'asset-group-alpha',
            imageUrl: 'https://example.com/collection-alpha.png',
            label: 'Alpha Collection',
            symbolMagicEden: 'alpha-symbol',
          },
          listings: [
            {
              assetAddress: 'asset-alpha',
              auctionHouseAddress: null,
              id: 'listing-alpha',
              imageUrl: 'https://example.com/listing-alpha.png',
              name: 'Alpha #1',
              priceSol: 1.25,
              seller: 'seller-alpha',
              sellerExpiry: 0,
              tokenAta: 'token-alpha',
              verification: 'verification-alpha',
            },
          ],
        },
        error: null,
        isError: false,
        isPending: false,
      }
    },
  }))
  mock.module('../src/features/community/data-access/use-community-asset-marketplace-listings-query.tsx', () => ({
    useCommunityAssetMarketplaceListingsQuery: (input: unknown) => {
      listingsQueryCalls.push(input)

      return {
        data: {
          assetGroup: {
            address: 'collection-alpha',
            id: 'asset-group-alpha',
            imageUrl: 'https://example.com/collection-alpha.png',
            label: 'Alpha Collection',
            symbolMagicEden: 'alpha-symbol',
          },
          listings: [
            {
              assetAddress: 'asset-alpha',
              auctionHouseAddress: null,
              id: 'listing-alpha',
              imageUrl: 'https://example.com/listing-alpha.png',
              name: 'Alpha #1',
              priceSol: 1.25,
              seller: 'seller-alpha',
              sellerExpiry: 0,
              tokenAta: 'token-alpha',
              verification: 'verification-alpha',
            },
          ],
        },
        error: null,
        isError: false,
        isPending: false,
      }
    },
  }))

  ;({ CommunityFeatureCollectionMarketplace } =
    await import('../src/features/community/feature/community-feature-collection-marketplace'))
})

afterAll(() => {
  mock.restore()
})

describe('CommunityFeatureCollectionMarketplace', () => {
  test('renders the shared marketplace browser for enabled collections', () => {
    listingsQueryCalls.length = 0

    const community = createCommunity()
    const markup = renderToStaticMarkup(
      <CommunityFeatureCollectionMarketplace
        initialCommunity={community}
        selectedCollection={community.collections[0]!}
      />,
    )

    expect(markup).toContain('Marketplace')
    expect(markup).toContain('Alpha Collection listings on Magic Eden.')
    expect(markup).toContain('Alpha #1')
    expect(markup).toContain('1.25 SOL')
    expect(listingsQueryCalls).toEqual([
      {
        assetGroupId: 'asset-group-alpha',
        enabled: true,
        limit: 100,
        slug: 'alpha-dao',
      },
    ])
  })

  test('renders an unavailable state for direct routes without marketplace access', () => {
    listingsQueryCalls.length = 0

    const community = createCommunity({ marketplaceEnabled: false })
    const markup = renderToStaticMarkup(
      <CommunityFeatureCollectionMarketplace
        initialCommunity={community}
        selectedCollection={community.collections[0]!}
      />,
    )

    expect(markup).toContain('Marketplace Unavailable')
    expect(markup).toContain('This collection is not available for marketplace purchases.')
    expect(listingsQueryCalls).toEqual([])
  })
})
