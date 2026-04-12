import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AdminOrganizationDetailEntity, AdminOrganizationListEntity } from '@tokengator/sdk'

import { AdminCommunityDirectoryUiList } from '../src/features/admin-community/ui/admin-community-directory-ui-list'

const directoryOrganization = {
  createdAt: new Date('2024-01-02T00:00:00.000Z'),
  id: 'org-1',
  logo: 'https://example.com/community.png',
  memberCount: 3,
  metadata: null,
  name: 'Alpha DAO',
  owners: [
    {
      name: 'Alice Example',
      userId: 'user-1',
      username: 'alice',
    },
  ],
  slug: 'alpha-dao',
} satisfies AdminOrganizationListEntity

const detailOrganization = {
  createdAt: new Date('2024-01-02T00:00:00.000Z'),
  discordConnection: null,
  id: 'org-1',
  logo: 'https://example.com/community.png',
  memberCount: 3,
  members: [],
  metadata: null,
  name: 'Alpha DAO',
  owners: [
    {
      name: 'Alice Example',
      userId: 'user-1',
      username: 'alice',
    },
  ],
  slug: 'alpha-dao',
} satisfies AdminOrganizationDetailEntity

let AdminCommunityFeatureShell: typeof import('../src/features/admin-community/feature/admin-community-feature-shell').AdminCommunityFeatureShell

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
    useLocation: () => ({
      pathname: '/admin/communities/org-1/overview',
    }),
    useNavigate: () => async () => undefined,
  }))

  mock.module('../src/features/admin-community/data-access/use-admin-community-get-query', () => ({
    useAdminCommunityGetQuery: () => ({
      data: detailOrganization,
      isPending: false,
    }),
  }))

  ;({ AdminCommunityFeatureShell } =
    await import('../src/features/admin-community/feature/admin-community-feature-shell'))
})

afterAll(() => {
  mock.restore()
})

describe('admin community UI', () => {
  test('renders a populated community directory row with the title override and community metadata', () => {
    const markup = renderToStaticMarkup(
      <AdminCommunityDirectoryUiList
        organizations={[directoryOrganization]}
        renderManageAction={() => <button type="button">Manage</button>}
        renderTitle={() => <a>Manage Alpha</a>}
      />,
    )

    expect(markup).toContain('Manage Alpha')
    expect(markup).toContain('@alpha-dao')
    expect(markup).toContain('Alice Example (@alice)')
    expect(markup).toContain('Members: 3')
    expect(markup).toContain('Created:')
  })

  test('renders the community detail header with the slug-prefixed subtitle and page content', () => {
    const markup = renderToStaticMarkup(
      <AdminCommunityFeatureShell initialOrganization={detailOrganization}>
        <div>Overview content</div>
      </AdminCommunityFeatureShell>,
    )

    expect(markup).toContain('Back to communities')
    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('@alpha-dao')
    expect(markup).toContain('Overview')
    expect(markup).toContain('Overview content')
  })
})
