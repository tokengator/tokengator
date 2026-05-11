import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CommunityGetBySlugResult, CommunityListResult } from '@tokengator/sdk'

const community = {
  collections: [],
  id: 'org-1',
  logo: 'https://example.com/community.png',
  marketplace: {
    magicEden: {
      enabled: false,
      unavailableReason: 'api-key-missing',
    },
  },
  name: 'Alpha DAO',
  roles: [],
  slug: 'alpha-dao',
} satisfies CommunityGetBySlugResult

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
      name: 'Beta DAO',
      slug: 'beta-dao',
    },
  ],
} satisfies CommunityListResult

let CommunityFeatureShell: typeof import('../src/features/community/feature/community-feature-shell').CommunityFeatureShell
let getCommunityCurrentTab: typeof import('../src/features/community/feature/community-feature-shell').getCommunityCurrentTab
let getCommunitySwitchNavigation: typeof import('../src/features/community/feature/community-feature-shell').getCommunitySwitchNavigation
let getCommunitySwitcherOptions: typeof import('../src/features/community/ui/community-ui-switcher-combobox').getCommunitySwitcherOptions
let pathname = '/communities/alpha-dao/overview'
const navigate = mock(() => Promise.resolve())

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children, className, title }: { children?: ReactNode; className?: string; title?: string }) => (
      <a className={className} title={title}>
        {children}
      </a>
    ),
    useLocation: () => ({
      pathname,
    }),
    useNavigate: () => navigate,
  }))

  mock.module('../src/features/community/data-access/use-community-list-query', () => ({
    useCommunityListQuery: (_options?: { initialData?: CommunityListResult }) => ({
      data: _options?.initialData,
    }),
  }))

  mock.module('../src/features/shell/ui/shell-ui-debug-button', () => ({
    ShellUiDebugButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
  }))

  ;({ CommunityFeatureShell, getCommunityCurrentTab } =
    await import('../src/features/community/feature/community-feature-shell'))
  ;({ getCommunitySwitchNavigation } = await import('../src/features/community/feature/community-feature-shell'))
  ;({ getCommunitySwitcherOptions } = await import('../src/features/community/ui/community-ui-switcher-combobox'))
})

afterAll(() => {
  mock.restore()
})

describe('CommunityFeatureShell', () => {
  test('renders the community switcher and route tabs', () => {
    pathname = '/communities/alpha-dao/overview'

    const markup = renderToStaticMarkup(
      <CommunityFeatureShell initialCommunities={communities} initialCommunity={community} isAdmin={false}>
        <div>Overview content</div>
      </CommunityFeatureShell>,
    )

    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('@alpha-dao')
    expect(markup).toContain('Overview')
    expect(markup).toContain('Collections')
    expect(markup).toContain('Community debug data')
    expect(markup).toContain('Overview content')
    expect(markup).toContain('Select community')
    expect(markup).toContain('data-variant="line"')
    expect(markup).toContain('items-center justify-between')
    expect(markup).toContain('max-w-6xl')
    expect(markup).toContain('w-fit max-w-full')
    expect(markup).not.toContain('Back to communities')
    expect(markup).not.toContain('md:max-w-md')
    expect(markup).not.toContain('Open admin community detail')
    expect(markup).not.toContain('sm:px-6')
    expect(markup).not.toContain('xl:max-w-7xl')
  })

  test('shows the admin community action for admins', () => {
    const markup = renderToStaticMarkup(
      <CommunityFeatureShell initialCommunities={communities} initialCommunity={community} isAdmin>
        <div>Overview content</div>
      </CommunityFeatureShell>,
    )

    expect(markup).toContain('Community debug data')
    expect(markup).toContain('Open admin community detail')
  })

  test('treats nested collection detail routes as the collections tab', () => {
    expect(getCommunityCurrentTab('/communities/alpha-dao/collections')).toBe('collections')
    expect(getCommunityCurrentTab('/communities/alpha-dao/collections/collection-alpha')).toBe('collections')
  })

  test('preserves the current community tab when switching communities', () => {
    expect(getCommunitySwitchNavigation({ slug: 'beta-dao', tab: 'collections' })).toEqual({
      params: {
        slug: 'beta-dao',
      },
      to: '/communities/$slug/collections',
    })
    expect(getCommunitySwitchNavigation({ slug: 'beta-dao', tab: 'overview' })).toEqual({
      params: {
        slug: 'beta-dao',
      },
      to: '/communities/$slug/overview',
    })
  })

  test('sorts community switcher options with all communities last', () => {
    expect(getCommunitySwitcherOptions([...communities.communities].reverse()).map((option) => option.name)).toEqual([
      'Alpha DAO',
      'Beta DAO',
      'All communities',
    ])
  })
})
