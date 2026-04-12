import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { ProfileUiAvatar } from '../src/features/profile/ui/profile-ui-avatar'

describe('ProfileUiAvatar', () => {
  test('forwards the requested size', () => {
    const markup = renderToStaticMarkup(
      <ProfileUiAvatar
        size="sm"
        user={{
          id: 'user-1',
          image: 'https://example.com/avatar.png',
          name: 'Alice Example',
          role: 'user',
          username: 'alice',
        }}
      />,
    )

    expect(markup).toContain('data-size="sm"')
  })
})
