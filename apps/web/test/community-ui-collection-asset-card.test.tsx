import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

describe('CommunityUiCollectionAssetCard', () => {
  test('renders only the centered asset title in the footer area', async () => {
    const { CommunityUiCollectionAssetCard } =
      await import('../src/features/community/ui/community-ui-collection-asset-card')
    const markup = renderToStaticMarkup(
      <CommunityUiCollectionAssetCard
        asset={{
          address: 'asset-alpha',
          id: 'asset-1',
          metadataImageUrl: null,
          metadataName: '420-Seal #12',
          metadataSymbol: 'SAC',
          owner: '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix',
        }}
      />,
    )

    expect(markup).toContain('420-Seal #12')
    expect(markup).toContain('justify-center')
    expect(markup).not.toContain('SAC')
    expect(markup).not.toContain('1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix')
  })
})
