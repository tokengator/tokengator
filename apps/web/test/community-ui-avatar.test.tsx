import type { ComponentProps } from 'react'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let CommunityUiAvatar: typeof import('../src/features/community/ui/community-ui-avatar').CommunityUiAvatar

beforeAll(async () => {
  mock.module('@tokengator/ui/components/avatar', () => ({
    Avatar: ({
      children,
      size,
    }: ComponentProps<'div'> & {
      size?: 'default' | 'lg' | 'sm'
    }) => (
      <div data-size={size} data-slot="avatar">
        {children}
      </div>
    ),
    AvatarFallback: ({ children }: ComponentProps<'span'>) => <span data-slot="avatar-fallback">{children}</span>,
    AvatarImage: ({ alt, src }: { alt: string; src?: string }) => <img alt={alt} data-slot="avatar-image" src={src} />,
  }))

  ;({ CommunityUiAvatar } = await import('../src/features/community/ui/community-ui-avatar'))
})

afterAll(() => {
  mock.restore()
})

describe('CommunityUiAvatar', () => {
  test('passes the requested size and image props through to the avatar primitives', () => {
    const markup = renderToStaticMarkup(
      <CommunityUiAvatar
        community={{
          logo: 'https://example.com/community.png',
          name: 'Alpha Beta',
        }}
        size="sm"
      />,
    )

    expect(markup).toContain('data-size="sm"')
    expect(markup).toContain('data-slot="avatar-image"')
    expect(markup).toContain('alt="Alpha Beta"')
    expect(markup).toContain('src="https://example.com/community.png"')
  })

  test('renders initials fallback when the community has no logo', () => {
    const markup = renderToStaticMarkup(
      <CommunityUiAvatar
        community={{
          logo: null,
          name: 'Alpha Beta',
        }}
      />,
    )

    expect(markup).toContain('src="https://api.dicebear.com/9.x/initials/png?seed=Alpha%20Beta"')
    expect(markup).toContain('<span data-slot="avatar-fallback">A</span>')
  })
})
