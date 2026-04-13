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

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children, className }: { children?: ReactNode; className?: string }) => (
      <a className={className}>{children}</a>
    ),
    useLocation: () => ({
      pathname: '/communities/alpha-dao/overview',
    }),
  }))

  ;({ CommunityFeatureShell } = await import('../src/features/community/feature/community-feature-shell'))
})

afterAll(() => {
  mock.restore()
})

describe('CommunityFeatureShell', () => {
  test('renders the detail header, back link, and route tabs', () => {
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
})
