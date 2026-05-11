import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AdminOrganizationDetailEntity, AdminOrganizationListEntity } from '@tokengator/sdk'

import { AdminCommunityDirectoryUiList } from '../src/features/admin-community/ui/admin-community-directory-ui-list'
import { AdminCommunitySettingsUiForm } from '../src/features/admin-community/ui/admin-community-settings-ui-form'

const directoryOrganization = {
  createdAt: new Date('2024-01-02T00:00:00.000Z'),
  description: null,
  discordUrl: null,
  githubUrl: null,
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
  telegramUrl: null,
  websiteUrl: null,
  xUrl: null,
} satisfies AdminOrganizationListEntity

const detailOrganization = {
  createdAt: new Date('2024-01-02T00:00:00.000Z'),
  description: 'Alpha community profile',
  discordConnection: null,
  discordUrl: 'https://discord.gg/alpha',
  githubUrl: 'https://github.com/alpha',
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
  telegramUrl: 'https://t.me/alpha',
  websiteUrl: 'https://alpha.example.com',
  xUrl: 'https://x.com/alpha',
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

  test('renders optional community profile fields in the settings form', () => {
    const markup = renderToStaticMarkup(
      <AdminCommunitySettingsUiForm
        initialValues={{
          description: 'Alpha community profile',
          discordUrl: 'https://discord.gg/alpha',
          githubUrl: 'https://github.com/alpha',
          logo: 'https://example.com/community.png',
          name: 'Alpha DAO',
          slug: 'alpha-dao',
          telegramUrl: 'https://t.me/alpha',
          websiteUrl: 'https://alpha.example.com',
          xUrl: 'https://x.com/alpha',
        }}
        isPending={false}
        onSubmit={async () => true}
      />,
    )

    expect(markup).toContain('Description')
    expect(markup).toContain('Discord URL')
    expect(markup).toContain('GitHub URL')
    expect(markup).toContain('maxLength="256"')
    expect(markup).toContain('Telegram URL')
    expect(markup).toContain('Website URL')
    expect(markup).toContain('X URL')
    expect(markup).toContain('Alpha community profile')
    expect(markup).toContain('value="https://discord.gg/alpha"')
    expect(markup).toContain('value="https://github.com/alpha"')
    expect(markup).toContain('value="https://t.me/alpha"')
    expect(markup).toContain('value="https://alpha.example.com"')
    expect(markup).toContain('value="https://x.com/alpha"')
  })
})
