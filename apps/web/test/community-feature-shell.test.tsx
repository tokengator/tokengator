import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CommunityGetBySlugResult } from '@tokengator/sdk'

const community = {
  collections: [],
  id: 'org-1',
  logo: 'https://example.com/community.png',
  name: 'Alpha DAO',
  slug: 'alpha-dao',
} satisfies CommunityGetBySlugResult

let CommunityFeatureShell: typeof import('../src/features/community/feature/community-feature-shell').CommunityFeatureShell
let getCommunityCurrentTab: typeof import('../src/features/community/feature/community-feature-shell').getCommunityCurrentTab
let pathname = '/communities/alpha-dao/overview'

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children, className }: { children?: ReactNode; className?: string }) => (
      <a className={className}>{children}</a>
    ),
    useLocation: () => ({
      pathname,
    }),
  }))

  ;({ CommunityFeatureShell, getCommunityCurrentTab } =
    await import('../src/features/community/feature/community-feature-shell'))
})

afterAll(() => {
  mock.restore()
})

describe('CommunityFeatureShell', () => {
  test('renders the detail header, back link, and route tabs', () => {
    pathname = '/communities/alpha-dao/overview'

    const markup = renderToStaticMarkup(
      <CommunityFeatureShell initialCommunity={community}>
        <div>Overview content</div>
      </CommunityFeatureShell>,
    )

    expect(markup).toContain('Back to communities')
    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('@alpha-dao')
    expect(markup).toContain('Overview')
    expect(markup).toContain('Collections')
    expect(markup).toContain('Overview content')
  })

  test('treats nested collection detail routes as the collections tab', () => {
    expect(getCommunityCurrentTab('/communities/alpha-dao/collections')).toBe('collections')
    expect(getCommunityCurrentTab('/communities/alpha-dao/collections/collection-alpha')).toBe('collections')
  })
})
