import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AdminAssetGroupWithIndexingStatus } from '@tokengator/sdk'

import { AdminAssetGroupUiTable } from '../src/features/admin-asset/ui/admin-asset-group-ui-table'

describe('AdminAssetGroupUiTable', () => {
  test('renders the image column before the label column', () => {
    const assetGroup = {
      address: 'collection-alpha',
      createdAt: new Date('2026-04-15T00:00:00.000Z'),
      decimals: 0,
      enabled: true,
      id: 'asset-group-alpha',
      imageUrl: 'https://example.com/collection-alpha.png',
      indexingStartedAt: null,
      indexingStatus: null,
      label: 'Alpha Collection',
      symbol: 'ALPHA',
      type: 'mint',
      updatedAt: new Date('2026-04-15T00:00:00.000Z'),
    } satisfies AdminAssetGroupWithIndexingStatus

    const markup = renderToStaticMarkup(
      <AdminAssetGroupUiTable assetGroups={[assetGroup]} renderActions={() => null} />,
    )

    const imageHeaderIndex = markup.indexOf('Image')
    const labelHeaderIndex = markup.indexOf('Label')

    expect(imageHeaderIndex).toBeGreaterThanOrEqual(0)
    expect(labelHeaderIndex).toBeGreaterThanOrEqual(0)
    expect(imageHeaderIndex).toBeLessThan(labelHeaderIndex)
    expect(markup).toContain('$ALPHA')
    expect(markup).toContain('https://example.com/collection-alpha.png')
    expect(markup).toContain('Alpha Collection')
  })
})
