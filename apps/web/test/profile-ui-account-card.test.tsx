import { beforeAll, describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let ProfileUiItem: typeof import('../src/features/profile/ui/profile-ui-item').ProfileUiItem

beforeAll(async () => {
  ;({ ProfileUiItem } = await import('../src/features/profile/ui/profile-ui-item'))
})

describe('ProfileUiItem', () => {
  test('renders the profile avatar shell when image is present', () => {
    const markup = renderToStaticMarkup(
      <ProfileUiItem
        user={{
          id: 'user-1',
          image: 'https://example.com/avatar.png',
          name: 'Alice Example',
          role: 'user',
          username: 'alice',
        }}
      />,
    )

    expect(markup).toContain('data-slot="avatar"')
    expect(markup).toContain('data-size="lg"')
  })

  test('renders the profile avatar shell when image is missing', () => {
    const markup = renderToStaticMarkup(
      <ProfileUiItem
        user={{
          id: 'user-1',
          image: null,
          name: 'Alice Example',
          role: 'user',
          username: 'alice',
        }}
      />,
    )

    expect(markup).toContain('data-slot="avatar"')
  })

  test('renders the user role fallback when the session role is missing', () => {
    const markup = renderToStaticMarkup(
      <ProfileUiItem
        user={{
          id: 'user-1',
          image: null,
          name: 'Alice',
          role: null,
          username: null,
        }}
      />,
    )

    expect(markup).toContain('>user<')
  })
})
