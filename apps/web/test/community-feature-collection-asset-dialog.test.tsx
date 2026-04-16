import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
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
  'cancelAnimationFrame',
  'document',
  'getComputedStyle',
  'navigator',
  'requestAnimationFrame',
  'window',
] as const

let domGlobalDescriptors: Array<[(typeof domGlobalKeys)[number], PropertyDescriptor | undefined]> = []
let domWindow: Window | null = null

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
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
  })
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: (handle: number) => clearTimeout(handle),
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

beforeEach(() => {
  ensureDom()
})

afterEach(() => {
  cleanup()
  mock.restore()
  restoreDom()
})

describe('CommunityCollectionAssetDialogContent', () => {
  test('renders the asset detail sections and calls the navigation handlers', async () => {
    const onClose = mock(() => {})
    const onNavigateToAsset = mock(() => {})
    const { CommunityCollectionAssetDialogContent } =
      await import('../src/features/community/feature/community-feature-collection-asset-dialog')

    const view = render(
      <CommunityCollectionAssetDialogContent
        asset={{
          address: 'asset-beta',
          id: 'asset-2',
          metadataImageUrl: 'https://example.com/asset-beta.png',
          metadataJson: {
            image: 'https://example.com/asset-beta.png',
            name: 'Perk #2',
          },
          metadataJsonUrl: 'https://example.com/asset-beta.json',
          metadataName: 'Perk #2',
          metadataSymbol: 'PERK',
          owner: 'owner-beta',
          traits: [
            {
              groupId: 'background',
              groupLabel: 'Background',
              value: 'forest',
              valueLabel: 'Forest',
            },
          ],
        }}
        assetAddress="asset-beta"
        assets={[
          {
            address: 'asset-alpha',
            id: 'asset-1',
            metadataImageUrl: null,
            metadataName: 'Perk #1',
            metadataSymbol: 'PERK',
            owner: 'owner-alpha',
            traits: [],
          },
          {
            address: 'asset-beta',
            id: 'asset-2',
            metadataImageUrl: 'https://example.com/asset-beta.png',
            metadataName: 'Perk #2',
            metadataSymbol: 'PERK',
            owner: 'owner-beta',
            traits: [],
          },
          {
            address: 'asset-gamma',
            id: 'asset-3',
            metadataImageUrl: null,
            metadataName: 'Perk #3',
            metadataSymbol: 'PERK',
            owner: 'owner-gamma',
            traits: [],
          },
        ]}
        onClose={onClose}
        onNavigateToAsset={onNavigateToAsset}
        selectedCollection={{
          address: 'collection-alpha',
          facetTotals: {},
          id: 'collection-1',
          imageUrl: null,
          label: 'Alpha Collection',
          type: 'collection',
        }}
      />,
    )

    expect(view.getByRole('heading', { name: 'Perk #2' })).toBeTruthy()
    expect(view.getByText('Owner')).toBeTruthy()
    expect(view.getByText('Traits')).toBeTruthy()
    expect(view.getByText('Background: Forest')).toBeTruthy()
    const jsonMetadataTrigger = view.getByRole('button', { name: 'JSON Metadata' })
    expect(jsonMetadataTrigger.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(jsonMetadataTrigger)
    expect(jsonMetadataTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(view.getByText('https://example.com/asset-beta.json')).toBeTruthy()
    expect(view.getByText(/"name": "Perk #2"/)).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Previous' }))
    expect(onNavigateToAsset).toHaveBeenCalledWith('asset-alpha')

    fireEvent.click(view.getByRole('button', { name: 'Next' }))
    expect(onNavigateToAsset).toHaveBeenCalledWith('asset-gamma')

    fireEvent.click(view.getByRole('button', { name: 'Back to collection' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
