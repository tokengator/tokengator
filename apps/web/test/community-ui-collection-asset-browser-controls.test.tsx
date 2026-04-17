import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterAll, afterEach, describe, expect, mock, test } from 'bun:test'
// @ts-expect-error jsdom is installed for tests but does not expose declarations in this workspace.
import { JSDOM } from 'jsdom'
import { renderToStaticMarkup } from 'react-dom/server'

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
      <button onClick={() => onDraftValueChange('draft-owner')} type="button">
        Set draft owner
      </button>
      <button onClick={() => onValueCommit('selected-owner')} type="button">
        Commit owner
      </button>
    </div>
  ),
}))
mock.module('@tokengator/ui/components/input', () => ({
  Input: (props: { id?: string; onChange?: (event: { target: { value: string } }) => void }) => (
    <div>
      <input {...props} />
      {props.id === 'community-collection-query' ? (
        <button
          onClick={() => {
            props.onChange?.({
              target: {
                value: 'perk',
              },
            })
          }}
          type="button"
        >
          Set query
        </button>
      ) : null}
    </div>
  ),
}))

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

afterEach(() => {
  cleanup()
  restoreDom()
})

afterAll(() => {
  mock.restore()
})

describe('CommunityUiCollectionAssetBrowserControls', () => {
  test('renders the search, owner, trait, and grid controls', async () => {
    const { CommunityUiCollectionAssetBrowserControls } =
      await import('../src/features/community/ui/community-ui-collection-asset-browser-controls')
    const markup = renderToStaticMarkup(
      <CommunityUiCollectionAssetBrowserControls
        facetGroups={[
          {
            id: 'background',
            label: 'Background',
            meta: 2,
            options: [
              {
                label: 'Forest',
                meta: 2,
                value: 'forest',
              },
            ],
          },
        ]}
        grid={4}
        initialFacets={{}}
        initialOwner=""
        initialQuery=""
        isOwnerCandidatesPending={false}
        isOwnerComboboxOpen={false}
        onApply={() => {}}
        onGridChange={() => {}}
        onOwnerComboboxOpenChange={() => {}}
        onOwnerCommit={() => {}}
        onOwnerDraftChange={() => {}}
        onReset={() => {}}
        ownerCandidates={[]}
      />,
    )

    expect(markup).toContain('Search')
    expect(markup).toContain('Owner')
    expect(markup).toContain('Traits')
    expect(markup).toContain('Grid')
    expect(markup).toContain('Search by asset name or address')
  })

  test('renders selected trait badges and an active trait indicator when traits are selected', async () => {
    const { CommunityUiCollectionAssetBrowserControls } =
      await import('../src/features/community/ui/community-ui-collection-asset-browser-controls')
    const markup = renderToStaticMarkup(
      <CommunityUiCollectionAssetBrowserControls
        facetGroups={[
          {
            id: 'background',
            label: 'Background',
            meta: 2,
            options: [
              {
                label: 'Forest',
                meta: 1,
                value: 'forest',
              },
              {
                label: 'Red',
                meta: 1,
                value: 'red',
              },
            ],
          },
        ]}
        grid={4}
        initialFacets={{
          background: ['red'],
        }}
        initialOwner=""
        initialQuery=""
        isOwnerCandidatesPending={false}
        isOwnerComboboxOpen={false}
        onApply={() => {}}
        onGridChange={() => {}}
        onOwnerComboboxOpenChange={() => {}}
        onOwnerCommit={() => {}}
        onOwnerDraftChange={() => {}}
        onReset={() => {}}
        ownerCandidates={[]}
      />,
    )

    expect(markup).toContain('Background: Red')
    expect(markup).toContain('Trait filters selected')
    expect(markup).toContain('Remove Background: Red trait filter')
  })

  test('auto-applies when removing a selected trait badge', async () => {
    ensureDom()

    const onApply = mock(() => {})
    const { CommunityUiCollectionAssetBrowserControls } =
      await import('../src/features/community/ui/community-ui-collection-asset-browser-controls')

    const view = render(
      <CommunityUiCollectionAssetBrowserControls
        facetGroups={[
          {
            id: 'background',
            label: 'Background',
            meta: 2,
            options: [
              {
                label: 'Forest',
                meta: 1,
                value: 'forest',
              },
              {
                label: 'Red',
                meta: 1,
                value: 'red',
              },
            ],
          },
        ]}
        grid={4}
        initialFacets={{
          background: ['red'],
        }}
        initialOwner="owner-1"
        initialQuery="perk"
        isOwnerCandidatesPending={false}
        isOwnerComboboxOpen={false}
        onApply={onApply}
        onGridChange={() => {}}
        onOwnerComboboxOpenChange={() => {}}
        onOwnerCommit={() => {}}
        onOwnerDraftChange={() => {}}
        onReset={() => {}}
        ownerCandidates={[]}
      />,
    )

    fireEvent.click(view.getByLabelText('Remove Background: Red trait filter'))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith({
      facets: {},
      owner: 'owner-1',
      query: 'perk',
    })
  })

  test('does not allow selecting disabled zero-count trait options', async () => {
    ensureDom()

    const onSelectedValuesChange = mock(() => {})
    const { UiFacetFilterPanel } = await import('@tokengator/ui/components/ui-facet-filter')
    const view = render(
      <UiFacetFilterPanel
        groups={[
          {
            id: 'background',
            label: 'Background',
            options: [
              {
                disabled: true,
                label: 'Red',
                meta: 0,
                value: 'red',
              },
            ],
          },
        ]}
        label="Traits"
        onSelectedValuesChange={onSelectedValuesChange}
        selectedValues={{}}
      />,
    )

    fireEvent.click(view.getByRole('button', { name: 'Background' }))

    const checkbox = view.container.querySelector('input[type="checkbox"]')

    if (!checkbox) {
      throw new Error('Expected a checkbox input to be rendered.')
    }

    fireEvent.click(checkbox)

    expect(checkbox.hasAttribute('disabled')).toBe(true)
    expect(onSelectedValuesChange).toHaveBeenCalledTimes(0)
  })

  test('renders facet groups collapsed by default', async () => {
    ensureDom()

    const { UiFacetFilterPanel } = await import('@tokengator/ui/components/ui-facet-filter')
    const view = render(
      <UiFacetFilterPanel
        groups={[
          {
            id: 'background',
            label: 'Background',
            options: [
              {
                label: 'Red',
                meta: 1,
                value: 'red',
              },
            ],
          },
        ]}
        label="Traits"
        onSelectedValuesChange={() => {}}
        selectedValues={{}}
      />,
    )

    expect(view.getByRole('button', { name: 'Background' }).getAttribute('aria-expanded')).toBe('false')
    expect(view.container.querySelector('input[type="checkbox"]')).toBeNull()
  })

  test('keeps typed owner local until apply and resyncs it from route owner changes', async () => {
    ensureDom()

    const onApply = mock(() => {})
    const onOwnerDraftChange = mock(() => {})
    const onOwnerCommit = mock(() => {})
    const { CommunityUiCollectionAssetBrowserControls } =
      await import('../src/features/community/ui/community-ui-collection-asset-browser-controls')

    const view = render(
      <CommunityUiCollectionAssetBrowserControls
        facetGroups={[]}
        grid={8}
        initialFacets={{}}
        initialOwner="owner-alpha"
        initialQuery=""
        isOwnerCandidatesPending={false}
        isOwnerComboboxOpen={false}
        onApply={onApply}
        onGridChange={() => {}}
        onOwnerComboboxOpenChange={() => {}}
        onOwnerCommit={onOwnerCommit}
        onOwnerDraftChange={onOwnerDraftChange}
        onReset={() => {}}
        ownerCandidates={[]}
      />,
    )

    fireEvent.click(view.getByRole('button', { name: 'Set draft owner' }))

    expect(onOwnerCommit).toHaveBeenCalledTimes(0)
    expect(onOwnerDraftChange).toHaveBeenCalledWith('draft-owner')

    fireEvent.click(view.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({
      facets: {},
      owner: 'draft-owner',
      query: '',
    })

    view.rerender(
      <CommunityUiCollectionAssetBrowserControls
        facetGroups={[]}
        grid={8}
        initialFacets={{}}
        initialOwner="selected-owner"
        initialQuery=""
        isOwnerCandidatesPending={false}
        isOwnerComboboxOpen={false}
        onApply={onApply}
        onGridChange={() => {}}
        onOwnerComboboxOpenChange={() => {}}
        onOwnerCommit={onOwnerCommit}
        onOwnerDraftChange={onOwnerDraftChange}
        onReset={() => {}}
        ownerCandidates={[]}
      />,
    )

    expect((view.getByLabelText('Owner input') as HTMLInputElement).value).toBe('selected-owner')
    expect(onOwnerDraftChange).toHaveBeenCalledWith('selected-owner')
  })

  test('preserves a typed query draft when the committed owner route value changes', async () => {
    ensureDom()

    const onOwnerDraftChange = mock(() => {})
    const onOwnerCommit = mock(() => {})
    const { CommunityUiCollectionAssetBrowserControls } =
      await import('../src/features/community/ui/community-ui-collection-asset-browser-controls')

    const view = render(
      <CommunityUiCollectionAssetBrowserControls
        facetGroups={[]}
        grid={8}
        initialFacets={{}}
        initialOwner=""
        initialQuery=""
        isOwnerCandidatesPending={false}
        isOwnerComboboxOpen={false}
        onApply={() => {}}
        onGridChange={() => {}}
        onOwnerComboboxOpenChange={() => {}}
        onOwnerCommit={onOwnerCommit}
        onOwnerDraftChange={onOwnerDraftChange}
        onReset={() => {}}
        ownerCandidates={[]}
      />,
    )

    fireEvent.click(view.getByRole('button', { name: 'Set query' }))
    fireEvent.click(view.getByRole('button', { name: 'Commit owner' }))

    expect(onOwnerCommit).toHaveBeenCalledWith('selected-owner')

    view.rerender(
      <CommunityUiCollectionAssetBrowserControls
        facetGroups={[]}
        grid={8}
        initialFacets={{}}
        initialOwner="selected-owner"
        initialQuery=""
        isOwnerCandidatesPending={false}
        isOwnerComboboxOpen={false}
        onApply={() => {}}
        onGridChange={() => {}}
        onOwnerComboboxOpenChange={() => {}}
        onOwnerCommit={onOwnerCommit}
        onOwnerDraftChange={onOwnerDraftChange}
        onReset={() => {}}
        ownerCandidates={[]}
      />,
    )

    expect((view.getByLabelText('Owner input') as HTMLInputElement).value).toBe('selected-owner')
    expect((view.getByLabelText('Search') as HTMLInputElement).value).toBe('perk')
  })
})
