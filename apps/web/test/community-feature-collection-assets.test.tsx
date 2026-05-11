import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import { cleanup, fireEvent, render } from '@testing-library/react'
// @ts-expect-error jsdom is installed for tests but does not expose declarations in this workspace.
import { JSDOM } from 'jsdom'

const domGlobalKeys = [
  'Element',
  'Event',
  'HTMLElement',
  'MouseEvent',
  'MutationObserver',
  'Node',
  'SVGElement',
  'document',
  'getComputedStyle',
  'navigator',
  'window',
] as const

let CommunityFeatureCollectionAssets: typeof import('../src/features/community/feature/community-feature-collection-assets').CommunityFeatureCollectionAssets
let domGlobalDescriptors: Array<[(typeof domGlobalKeys)[number], PropertyDescriptor | undefined]> = []
let domWindow: Window | null = null
const navigate = mock(() => Promise.resolve())
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
    useNavigate: () => navigate,
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
  mock.module('../src/features/community/ui/community-ui-collection-owner-combobox', () => ({
    CommunityUiCollectionOwnerCombobox: ({
      draftValue,
      id,
      isOpen: _isOpen,
      isPending: _isPending,
      onDraftValueChange,
      onOpenChange: _onOpenChange,
      onValueCommit,
    }: {
      draftValue: string
      id: string
      isOpen: boolean
      isPending: boolean
      onDraftValueChange: (value: string) => void
      onOpenChange: (open: boolean) => void
      onValueCommit: (value: string) => void
    }) => (
      <div>
        <input
          aria-label="Owner input"
          id={id}
          onChange={(event) => onDraftValueChange((event.target as HTMLInputElement).value)}
          value={draftValue}
        />
        <button onClick={() => onValueCommit('selected-owner')} type="button">
          Commit owner
        </button>
      </div>
    ),
  }))

  ;({ CommunityFeatureCollectionAssets } =
    await import('../src/features/community/feature/community-feature-collection-assets'))
})

afterAll(() => {
  mock.restore()
})

afterEach(() => {
  cleanup()
  navigate.mockClear()
  restoreDom()
})

describe('CommunityFeatureCollectionAssets', () => {
  test('clears facets and text query when switching collections while preserving owner and grid', async () => {
    const { getCommunityCollectionSwitchNavigation } =
      await import('../src/features/community/feature/community-feature-collection-shell')

    expect(
      getCommunityCollectionSwitchNavigation({
        address: 'collection-beta',
        search: {
          facets: {
            background: ['forest'],
          },
          grid: 8,
          owner: 'owner-alpha',
          query: 'perk',
        },
        slug: 'alpha-dao',
        tab: 'assets',
      }),
    ).toEqual({
      params: {
        address: 'collection-beta',
        slug: 'alpha-dao',
      },
      search: {
        facets: undefined,
        grid: 8,
        owner: 'owner-alpha',
        query: undefined,
      },
      to: '/communities/$slug/collections/$address',
    })

    expect(
      getCommunityCollectionSwitchNavigation({
        address: 'collection-beta',
        search: {
          facets: {
            background: ['forest'],
          },
          grid: 8,
          owner: 'owner-alpha',
          query: 'perk',
        },
        slug: 'alpha-dao',
        tab: 'insights',
      }),
    ).toEqual({
      params: {
        address: 'collection-beta',
        slug: 'alpha-dao',
      },
      search: {
        facets: undefined,
        grid: 8,
        owner: undefined,
        query: undefined,
      },
      to: '/communities/$slug/collections/$address/insights',
    })
  })

  test('navigates immediately when an owner autocomplete value is committed', () => {
    ensureDom()

    const collections = [
      {
        address: 'collection-alpha',
        facetTotals: {},
        id: 'collection-1',
        imageUrl: 'https://api.dicebear.com/9.x/glass/svg?seed=asset-group%3Acollection-1',
        label: 'Alpha Collection',
        symbolMagicEden: null,
        type: 'collection' as const,
      },
    ]
    const collectionAssets = {
      assets: [],
      facetTotals: {},
    }

    const view = render(
      <CommunityFeatureCollectionAssets
        initialCollectionAssets={collectionAssets}
        search={{
          facets: {
            background: ['forest'],
          },
          grid: 8,
          owner: 'owner-alpha',
          query: 'perk',
        }}
        selectedCollection={collections[0]!}
        slug="alpha-dao"
      />,
    )

    fireEvent.click(view.getByRole('button', { name: 'Commit owner' }))

    expect(navigate).toHaveBeenCalledWith({
      params: {
        address: 'collection-alpha',
        slug: 'alpha-dao',
      },
      search: {
        facets: {
          background: ['forest'],
        },
        grid: 8,
        owner: 'selected-owner',
        query: 'perk',
      },
      to: '/communities/$slug/collections/$address',
    })
  })
})
