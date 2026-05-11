import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import { cleanup, fireEvent, render } from '@testing-library/react'
// @ts-expect-error jsdom is installed for tests but does not expose declarations in this workspace.
import { JSDOM } from 'jsdom'
import type { ReactNode } from 'react'
import type {
  CommunityCollectionEntity,
  CommunityCollectionLeaderboardHolderFilter,
  CommunityListCollectionLeaderboardResult,
} from '@tokengator/sdk'

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

type LeaderboardQueryInput = {
  address: string
  holderFilter?: CommunityCollectionLeaderboardHolderFilter
  limit?: number
  slug: string
}

type LeaderboardQueryOptions = {
  initialData?: CommunityListCollectionLeaderboardResult | null
}

let CommunityFeatureCollectionLeaderboard: typeof import('../src/features/community/feature/community-feature-collection-leaderboard').CommunityFeatureCollectionLeaderboard
let domGlobalDescriptors: Array<[(typeof domGlobalKeys)[number], PropertyDescriptor | undefined]> = []
let domWindow: Window | null = null
const leaderboardQueryCalls: Array<{ input: LeaderboardQueryInput; options?: LeaderboardQueryOptions }> = []
const leaderboardQueryState: {
  data: CommunityListCollectionLeaderboardResult | null
  error: Error | null
  isFetching: boolean
  isPending: boolean
} = {
  data: null,
  error: null,
  isFetching: false,
  isPending: false,
}

const initialCollectionLeaderboard = {
  assetTotal: 3,
  holders: [
    {
      assetTotal: 1,
      displayName: 'owner-alpha',
      holderId: 'wallet:owner-alpha',
      kind: 'wallet',
      rank: 1,
      user: null,
      wallets: [
        {
          address: 'owner-alpha',
          assets: [],
          assetTotal: 1,
          id: null,
          name: null,
        },
      ],
    },
  ],
  holderTotal: 3,
} satisfies CommunityListCollectionLeaderboardResult

const selectedCollection = {
  address: 'collection-alpha',
  facetTotals: {},
  id: 'collection-alpha',
  imageUrl: 'https://example.com/collection-alpha.png',
  label: 'Alpha Collection',
  symbolMagicEden: null,
  type: 'collection',
} satisfies CommunityCollectionEntity

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
  mock.module('../src/features/community/data-access/use-community-collection-leaderboard-query', () => ({
    COMMUNITY_COLLECTION_LEADERBOARD_LIMIT_INCREMENT: 100,
    COMMUNITY_COLLECTION_LEADERBOARD_MAX_LIMIT: 1000,
    useCommunityCollectionLeaderboardQuery: (input: LeaderboardQueryInput, options?: LeaderboardQueryOptions) => {
      leaderboardQueryCalls.push({ input, options })

      return leaderboardQueryState
    },
  }))
  mock.module('../src/features/community/data-access/use-community-collection-leaderboard-query.tsx', () => ({
    COMMUNITY_COLLECTION_LEADERBOARD_LIMIT_INCREMENT: 100,
    COMMUNITY_COLLECTION_LEADERBOARD_MAX_LIMIT: 1000,
    useCommunityCollectionLeaderboardQuery: (input: LeaderboardQueryInput, options?: LeaderboardQueryOptions) => {
      leaderboardQueryCalls.push({ input, options })

      return leaderboardQueryState
    },
  }))

  ;({ CommunityFeatureCollectionLeaderboard } =
    await import('../src/features/community/feature/community-feature-collection-leaderboard'))
})

afterAll(() => {
  mock.restore()
})

afterEach(() => {
  cleanup()
  leaderboardQueryCalls.length = 0
  leaderboardQueryState.data = null
  leaderboardQueryState.error = null
  leaderboardQueryState.isFetching = false
  leaderboardQueryState.isPending = false
  restoreDom()
})

describe('CommunityFeatureCollectionLeaderboard', () => {
  test('uses server initial data only for the initial leaderboard limit', () => {
    ensureDom()
    leaderboardQueryState.data = initialCollectionLeaderboard

    const view = render(
      <CommunityFeatureCollectionLeaderboard
        initialCollectionLeaderboard={initialCollectionLeaderboard}
        selectedCollection={selectedCollection}
        slug="alpha-dao"
      />,
    )

    expect(leaderboardQueryCalls).toHaveLength(1)
    expect(leaderboardQueryCalls[0]?.input).toEqual({
      address: 'collection-alpha',
      holderFilter: 'known',
      limit: undefined,
      slug: 'alpha-dao',
    })
    expect(leaderboardQueryCalls[0]?.options?.initialData).toBe(initialCollectionLeaderboard)

    fireEvent.click(view.getByText('Show more'))

    expect(leaderboardQueryCalls).toHaveLength(2)
    expect(leaderboardQueryCalls[1]?.input).toEqual({
      address: 'collection-alpha',
      holderFilter: 'known',
      limit: 200,
      slug: 'alpha-dao',
    })
    expect(leaderboardQueryCalls[1]?.options?.initialData).toBeUndefined()

    fireEvent.click(view.getByText('Unknown'))

    expect(leaderboardQueryCalls).toHaveLength(3)
    expect(leaderboardQueryCalls[2]?.input).toEqual({
      address: 'collection-alpha',
      holderFilter: 'unknown',
      limit: undefined,
      slug: 'alpha-dao',
    })
    expect(leaderboardQueryCalls[2]?.options?.initialData).toBeUndefined()
  })
})
