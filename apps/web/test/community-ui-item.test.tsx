import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

describe('CommunityUiItem', () => {
  test('renders the community name and default slug subtitle', async () => {
    const { CommunityUiItem } = await import('../src/features/community/ui/community-ui-item')
    const markup = renderToStaticMarkup(
      <CommunityUiItem
        community={{
          logo: null,
          name: 'Alpha DAO',
          slug: 'alpha-dao',
        }}
      />,
    )

    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('@alpha-dao')
  })

  test('renders title override plus optional meta, footer, and action content', async () => {
    const { CommunityUiItem } = await import('../src/features/community/ui/community-ui-item')
    const markup = renderToStaticMarkup(
      <CommunityUiItem
        action={<button type="button">Manage</button>}
        community={{
          logo: 'https://example.com/alpha.png',
          name: 'Alpha DAO',
          slug: 'alpha-dao',
        }}
        footer={<div>Members: 3</div>}
        meta={<span>owner</span>}
        title={<span>Linked Alpha</span>}
      />,
    )

    expect(markup).toContain('Linked Alpha')
    expect(markup).toContain('Manage')
    expect(markup).toContain('Members: 3')
    expect(markup).toContain('owner')
  })
})
