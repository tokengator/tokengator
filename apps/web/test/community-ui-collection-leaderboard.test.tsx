import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import { cleanup, fireEvent, render } from '@testing-library/react'
// @ts-expect-error jsdom is installed for tests but does not expose declarations in this workspace.
import { JSDOM } from 'jsdom'
import type { ReactNode } from 'react'

const domGlobalKeys = [
  'Element',
  'Event',
  'HTMLElement',
  'MouseEvent',
  'MutationObserver',
  'Node',
  'SVGElement',
  'cancelAnimationFrame',
  'document',
  'getComputedStyle',
  'navigator',
  'requestAnimationFrame',
  'window',
] as const

let domGlobalDescriptors: Array<[(typeof domGlobalKeys)[number], PropertyDescriptor | undefined]> = []
let domWindow: Window | null = null
let CommunityUiCollectionLeaderboard: typeof import('../src/features/community/ui/community-ui-collection-leaderboard').CommunityUiCollectionLeaderboard

function ensureDom() {
  if (typeof document !== 'undefined') {
    return
  }

  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  domGlobalDescriptors = domGlobalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  domWindow = dom.window as unknown as Window

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: dom.window.document,
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: dom.window,
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  })
  Object.defineProperty(globalThis, 'Element', {
    configurable: true,
    value: dom.window.Element,
  })
  Object.defineProperty(globalThis, 'Event', {
    configurable: true,
    value: dom.window.Event,
  })
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: dom.window.HTMLElement,
  })
  Object.defineProperty(globalThis, 'MouseEvent', {
    configurable: true,
    value: dom.window.MouseEvent,
  })
  Object.defineProperty(globalThis, 'MutationObserver', {
    configurable: true,
    value: dom.window.MutationObserver,
  })
  Object.defineProperty(globalThis, 'Node', {
    configurable: true,
    value: dom.window.Node,
  })
  Object.defineProperty(globalThis, 'SVGElement', {
    configurable: true,
    value: dom.window.SVGElement,
  })
  Object.defineProperty(globalThis, 'getComputedStyle', {
    configurable: true,
    value: dom.window.getComputedStyle.bind(dom.window),
  })
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
  })
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: (handle: number) => clearTimeout(handle),
  })
}

function restoreDom() {
  for (const [key, descriptor] of domGlobalDescriptors) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor)
    } else {
      delete globalThis[key]
    }
  }

  domGlobalDescriptors = []
  domWindow?.close()
  domWindow = null
}

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
        data-owner={typeof search?.owner === 'string' ? search.owner : undefined}
        data-slug={params?.slug}
        data-to={to}
      >
        {children}
      </a>
    ),
  }))

  ;({ CommunityUiCollectionLeaderboard } =
    await import('../src/features/community/ui/community-ui-collection-leaderboard'))
})

afterAll(() => {
  mock.restore()
})

afterEach(() => {
  cleanup()
  restoreDom()
})

describe('CommunityUiCollectionLeaderboard', () => {
  test('renders profile holder groups and wallet breakdowns', () => {
    ensureDom()

    const onShowMore = mock(() => {})
    const onHolderFilterChange = mock(() => {})
    const view = render(
      <CommunityUiCollectionLeaderboard
        canShowMore
        holderFilter="known"
        leaderboard={{
          assetTotal: 3,
          holders: [
            {
              assetTotal: 3,
              displayName: '@alpha-owner',
              holderId: 'user:user-alpha-owner',
              kind: 'user',
              rank: 1,
              user: {
                id: 'user-alpha-owner',
                image: 'https://example.com/alpha-owner.png',
                name: 'Alpha Owner',
                username: 'alpha-owner',
              },
              wallets: [
                {
                  address: 'owner-alpha-a',
                  assets: [
                    {
                      address: 'mint-alpha-a',
                      id: 'asset-alpha-a',
                      metadataImageUrl: 'https://example.com/alpha-a.png',
                      metadataName: 'Alpha A',
                      metadataSymbol: 'ALPHA',
                    },
                    {
                      address: 'mint-alpha-b',
                      id: 'asset-alpha-b',
                      metadataImageUrl: null,
                      metadataName: 'Alpha B',
                      metadataSymbol: 'ALPHA',
                    },
                  ],
                  assetTotal: 2,
                  id: 'wallet-alpha-a',
                  name: null,
                },
                {
                  address: 'owner-alpha-b',
                  assets: [
                    {
                      address: 'mint-alpha-c',
                      id: 'asset-alpha-c',
                      metadataImageUrl: null,
                      metadataName: null,
                      metadataSymbol: 'ALPHA',
                    },
                  ],
                  assetTotal: 1,
                  id: 'wallet-alpha-b',
                  name: 'Vault',
                },
              ],
            },
            {
              assetTotal: 1,
              displayName: 'owner-standalone',
              holderId: 'wallet:owner-standalone',
              kind: 'wallet',
              rank: 2,
              user: null,
              wallets: [
                {
                  address: 'owner-standalone',
                  assets: [
                    {
                      address: 'mint-standalone-a',
                      id: 'asset-standalone-a',
                      metadataImageUrl: null,
                      metadataName: 'Standalone A',
                      metadataSymbol: 'ALPHA',
                    },
                  ],
                  assetTotal: 1,
                  id: null,
                  name: null,
                },
              ],
            },
          ],
          holderTotal: 2,
        }}
        onHolderFilterChange={onHolderFilterChange}
        onShowMore={onShowMore}
        selectedCollection={{
          address: 'collection-alpha',
          facetTotals: {},
          id: 'collection-alpha',
          imageUrl: 'https://example.com/collection-alpha.png',
          label: 'Alpha Collection',
          symbolMagicEden: null,
          type: 'collection',
        }}
        slug="alpha-dao"
      />,
    )
    const trigger = view.getByText('@alpha-owner').closest('button')

    if (!trigger) {
      throw new Error('Expected holder row trigger to render.')
    }

    expect(view.getByText('@alpha-owner')).toBeTruthy()
    expect(view.getByText('Alpha Owner')).toBeTruthy()
    expect(view.container.querySelector('[data-slot="avatar"]')).toBeTruthy()

    fireEvent.click(view.getByText('Unknown'))

    expect(onHolderFilterChange).toHaveBeenCalledWith('unknown')

    fireEvent.click(trigger)

    expect(view.getByText('owner-alpha-a')).toBeTruthy()
    expect(view.getByText('owner-alpha-b')).toBeTruthy()
    expect(view.getByText('Vault')).toBeTruthy()
    expect(view.getByText('Alpha A')).toBeTruthy()
    expect(view.getByText('Alpha B')).toBeTruthy()
    expect(view.getByText('mint-alpha-c')).toBeTruthy()

    const assetLink = view.getByText('Alpha A').closest('a')

    expect(assetLink?.getAttribute('data-address')).toBe('collection-alpha')
    expect(assetLink?.getAttribute('data-asset')).toBe('mint-alpha-a')
    expect(assetLink?.getAttribute('data-grid')).toBe('8')
    expect(assetLink?.getAttribute('data-owner')).toBe('owner-alpha-a')
    expect(assetLink?.getAttribute('data-slug')).toBe('alpha-dao')
    expect(assetLink?.getAttribute('data-to')).toBe('/communities/$slug/collections/$address/asset/$asset')

    const standaloneTrigger = view.getByText('owner-standalone').closest('button')

    if (!standaloneTrigger) {
      throw new Error('Expected standalone holder row trigger to render.')
    }

    fireEvent.click(standaloneTrigger)

    const standaloneAssetLink = view.getByText('Standalone A').closest('a')

    expect(standaloneAssetLink?.getAttribute('data-asset')).toBe('mint-standalone-a')
    expect(standaloneAssetLink?.getAttribute('data-owner')).toBe('owner-standalone')

    fireEvent.click(view.getByText('Show more'))

    expect(onShowMore).toHaveBeenCalledTimes(1)
  })
})
