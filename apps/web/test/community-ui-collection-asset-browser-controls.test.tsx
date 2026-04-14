import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

describe('CommunityUiCollectionAssetBrowserControls', () => {
  test('renders the search, owner, and grid controls', async () => {
    const { CommunityUiCollectionAssetBrowserControls } =
      await import('../src/features/community/ui/community-ui-collection-asset-browser-controls')
    const markup = renderToStaticMarkup(
      <CommunityUiCollectionAssetBrowserControls
        grid={4}
        initialOwner=""
        initialQuery=""
        onApply={() => {}}
        onGridChange={() => {}}
        onReset={() => {}}
      />,
    )

    expect(markup).toContain('Search')
    expect(markup).toContain('Owner')
    expect(markup).toContain('Grid')
    expect(markup).toContain('Search by asset name or address')
  })
})
