import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CommunityGetBySlugResult } from '@tokengator/sdk'

let CommunityFeatureAssetMarketplace: typeof import('../src/features/community/feature/community-feature-asset-marketplace').CommunityFeatureAssetMarketplace

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

const assetGroup: CommunityGetBySlugResult['roles'][number]['assetGroups'][number] = {
  address: 'collection-alpha',
  id: 'asset-group-alpha',
  imageUrl: 'https://example.com/collection-alpha.png',
  label: 'Alpha Collection',
  maximumAmount: null,
  minimumAmount: '1',
  resolverKind: 'helius-collection-assets',
  symbolMagicEden: 'alpha-symbol',
  type: 'collection',
}
const assetMarketplace: CommunityGetBySlugResult['collections'][number]['assetMarketplace'] = {
  assetGroupId: 'asset-group-alpha',
  enabled: true,
  unavailableReason: null,
}
const marketplace: CommunityGetBySlugResult['marketplace'] = {
  magicEden: {
    enabled: true,
    unavailableReason: null,
  },
}

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: MockLink,
  }))
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
  mock.module('@/routes/__root', () => ({
    Route: {
      useRouteContext: () => ({
        appAuthState: {
          solanaWallets: {
            solanaWallets: [],
          },
        },
        appConfig: {
          solanaCluster: 'devnet',
        },
      }),
    },
  }))
  mock.module('../src/features/community/data-access/use-community-asset-marketplace-access-refresh', () => ({
    useCommunityAssetMarketplaceAccessRefresh: () => ({
      isPending: false,
      mutateAsync: async () => ({
        indexing: {
          status: 'succeeded',
        },
        membershipSync: {
          status: 'succeeded',
        },
      }),
    }),
  }))
  mock.module('../src/features/community/data-access/use-community-asset-marketplace-buy-prepare', () => ({
    useCommunityAssetMarketplaceBuyPrepare: () => ({
      isPending: false,
      mutateAsync: async () => ({
        transaction: {
          data: '',
        },
      }),
    }),
  }))
  mock.module('../src/features/community/data-access/use-community-asset-marketplace-listings-query', () => ({
    useCommunityAssetMarketplaceListingsQuery: () => ({
      data: {
        listings: [],
      },
      error: null,
      isError: false,
      isPending: false,
    }),
  }))

  ;({ CommunityFeatureAssetMarketplace } =
    await import('../src/features/community/feature/community-feature-asset-marketplace'))
})

afterAll(() => {
  mock.restore()
})

describe('CommunityFeatureAssetMarketplace', () => {
  test('links enabled collection buy actions to the marketplace tab', () => {
    const markup = renderToStaticMarkup(
      <CommunityFeatureAssetMarketplace
        assetGroup={assetGroup}
        assetMarketplace={assetMarketplace}
        marketplace={marketplace}
        slug="alpha-dao"
      />,
    )

    expect(markup).toContain('Buy NFT')
    expect(markup).toContain('href="/communities/alpha-dao/collections/collection-alpha/marketplace?grid=8"')
  })

  test('omits unavailable collection buy actions', () => {
    const markup = renderToStaticMarkup(
      <CommunityFeatureAssetMarketplace
        assetGroup={assetGroup}
        assetMarketplace={{
          assetGroupId: 'asset-group-alpha',
          enabled: false,
          unavailableReason: 'api-key-missing',
        }}
        marketplace={{
          magicEden: {
            enabled: false,
            unavailableReason: 'api-key-missing',
          },
        }}
        slug="alpha-dao"
      />,
    )

    expect(markup).not.toContain('Buy NFT')
  })
})
