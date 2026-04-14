import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

describe('CommunityUiCollectionCombobox', () => {
  test('renders the selected collection name and address even when only one collection is available', async () => {
    const { CommunityUiCollectionCombobox } =
      await import('../src/features/community/ui/community-ui-collection-combobox')
    const markup = renderToStaticMarkup(
      <CommunityUiCollectionCombobox
        collections={[
          {
            address: '1234567890abcdefghijklmnop',
            id: 'collection-1',
            label: 'Alpha Collection',
            type: 'collection',
          },
        ]}
        onCollectionChange={() => {}}
        selectedCollectionAddress="1234567890abcdefghijklmnop"
      />,
    )

    expect(markup).toContain('Collection')
    expect(markup).toContain('community-collection-combobox')
    expect(markup).toContain('Alpha Collection')
    expect(markup).toContain('1234..mnop')
  })
})
