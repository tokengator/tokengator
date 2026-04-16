import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let CommunityUiCollectionAssetCard: typeof import('../src/features/community/ui/community-ui-collection-asset-card').CommunityUiCollectionAssetCard

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({
      children,
      className,
      params,
      search,
      to,
    }: {
      children?: ReactNode
      className?: string
      params?: Record<string, string>
      search?: Record<string, unknown>
      to?: string
    }) => (
      <a
        className={className}
        data-address={params?.address}
        data-asset={params?.asset}
        data-grid={search?.grid}
        data-slug={params?.slug}
        data-to={to}
      >
        {children}
      </a>
    ),
  }))

  ;({ CommunityUiCollectionAssetCard } =
    await import('../src/features/community/ui/community-ui-collection-asset-card'))
})

afterAll(() => {
  mock.restore()
})

describe('CommunityUiCollectionAssetCard', () => {
  test('renders the asset as a deep-linkable card while keeping the footer content minimal', () => {
    const markup = renderToStaticMarkup(
      <CommunityUiCollectionAssetCard
        asset={{
          address: 'asset-alpha',
          id: 'asset-1',
          metadataImageUrl: null,
          metadataName: '420-Seal #12',
          metadataSymbol: 'SAC',
          owner: '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix',
          traits: [],
        }}
        navigation={{
          params: {
            address: 'collection-alpha',
            asset: 'asset-alpha',
            slug: 'alpha-dao',
          },
          search: {
            facets: undefined,
            grid: 8,
            owner: 'owner-alpha',
            query: 'perk',
          },
          to: '/communities/$slug/collections/$address/asset/$asset',
        }}
      />,
    )

    expect(markup).toContain('420-Seal #12')
    expect(markup).toContain('data-address="collection-alpha"')
    expect(markup).toContain('data-asset="asset-alpha"')
    expect(markup).toContain('data-grid="8"')
    expect(markup).toContain('data-slug="alpha-dao"')
    expect(markup).toContain('/communities/$slug/collections/$address/asset/$asset')
    expect(markup).toContain('justify-center')
    expect(markup).not.toContain('SAC')
    expect(markup).not.toContain('1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix')
  })
})
