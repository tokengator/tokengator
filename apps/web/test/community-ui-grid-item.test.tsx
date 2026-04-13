import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CommunityListResult } from '@tokengator/sdk'

const communities = {
  communities: [
    {
      id: 'org-1',
      logo: 'https://example.com/community.png',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    },
    {
      id: 'org-2',
      logo: null,
      name: 'Beta Club',
      slug: 'beta-club',
    },
  ],
} satisfies CommunityListResult

let CommunityFeatureDirectory: typeof import('../src/features/community/feature/community-feature-directory').CommunityFeatureDirectory
let CommunityUiGridItem: typeof import('../src/features/community/ui/community-ui-grid-item').CommunityUiGridItem

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children, className }: { children?: ReactNode; className?: string }) => (
      <a className={className}>{children}</a>
    ),
  }))

  mock.module('../src/features/community/data-access/use-community-list-query', () => ({
    useCommunityListQuery: () => ({
      data: communities,
      error: null,
      isPending: false,
    }),
  }))

  ;({ CommunityFeatureDirectory } = await import('../src/features/community/feature/community-feature-directory'))
  ;({ CommunityUiGridItem } = await import('../src/features/community/ui/community-ui-grid-item'))
})

afterAll(() => {
  mock.restore()
})

describe('community grid UI', () => {
  test('renders a square community grid item with the community name', () => {
    const markup = renderToStaticMarkup(<CommunityUiGridItem community={communities.communities[0]!} />)

    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('aspect-square')
  })

  test('renders the community directory grid', () => {
    const markup = renderToStaticMarkup(<CommunityFeatureDirectory initialCommunities={communities} />)

    expect(markup).toContain('Communities')
    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('Beta Club')
  })
})
