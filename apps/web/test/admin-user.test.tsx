import type { ReactElement } from 'react'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminUserAssetsUiTable } from '../src/features/admin-user/ui/admin-user-assets-ui-table'
import { AdminUserCommunitiesUiList } from '../src/features/admin-user/ui/admin-user-communities-ui-list'
import { AdminUserDirectoryUiList } from '../src/features/admin-user/ui/admin-user-directory-ui-list'
import { AdminUserDirectoryUiSearch } from '../src/features/admin-user/ui/admin-user-directory-ui-search'
import { AdminUserIdentitiesUiContent } from '../src/features/admin-user/ui/admin-user-identities-ui-content'
import { Route as AdminUserIndexRoute } from '../src/routes/admin/users/$userId/index'

function renderMarkup(element: ReactElement) {
  return renderToStaticMarkup(element)
}

describe('admin user routes', () => {
  test('redirects the user detail index route to the overview tab', async () => {
    try {
      await AdminUserIndexRoute.options.beforeLoad?.({
        params: {
          userId: 'user-1',
        },
      } as never)
    } catch (error) {
      expect(error).toMatchObject({
        options: {
          params: {
            userId: 'user-1',
          },
          to: '/admin/users/$userId/overview',
        },
      })

      return
    }

    throw new Error('Expected the route to redirect.')
  })
})

describe('admin user UI', () => {
  test('renders the default empty state for the user directory', () => {
    const markup = renderMarkup(
      <AdminUserDirectoryUiList isSearchActive={false} renderManageAction={() => null} users={[]} />,
    )

    expect(markup).toContain('No Users')
  })

  test('renders the search empty state for the user directory', () => {
    const markup = renderMarkup(<AdminUserDirectoryUiList isSearchActive renderManageAction={() => null} users={[]} />)

    expect(markup).toContain('No results found')
  })

  test('renders an accessible label for the user directory search', () => {
    const markup = renderMarkup(<AdminUserDirectoryUiSearch onChange={() => undefined} value="" />)

    expect(markup).toContain('Search users')
    expect(markup).toContain('id="admin-user-directory-search"')
  })

  test('renders empty identities and wallet states', () => {
    const markup = renderMarkup(
      <AdminUserIdentitiesUiContent identities={[]} isIdentityPending={false} isWalletPending={false} wallets={[]} />,
    )

    expect(markup).toContain('No linked identities yet.')
    expect(markup).toContain('No linked Solana wallets yet.')
  })

  test('renders the empty communities state', () => {
    const markup = renderMarkup(
      <AdminUserCommunitiesUiList
        communities={[]}
        isRemovePending={false}
        isUpdatePending={false}
        onRemove={() => undefined}
        onRoleChange={() => undefined}
      />,
    )

    expect(markup).toContain('This user has no communities.')
  })

  test('renders populated communities with avatar, role control, and actions', () => {
    const markup = renderMarkup(
      <AdminUserCommunitiesUiList
        communities={[
          {
            createdAt: new Date('2024-01-02T00:00:00.000Z'),
            gatedRoles: [
              {
                id: 'role-1',
                name: 'Genesis Holder',
                slug: 'genesis-holder',
              },
            ],
            id: 'member-1',
            logo: 'https://example.com/community.png',
            name: 'Alpha DAO',
            organizationId: 'org-1',
            role: 'owner',
            slug: 'alpha-dao',
          },
        ]}
        isRemovePending={false}
        isUpdatePending={false}
        onRemove={() => undefined}
        onRoleChange={() => undefined}
      />,
    )

    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('@alpha-dao')
    expect(markup).toContain('Genesis Holder')
    expect(markup).toContain('Role for Alpha DAO')
    expect(markup).toContain('Remove')
  })

  test('renders the empty assets state', () => {
    const markup = renderMarkup(<AdminUserAssetsUiTable assets={[]} />)

    expect(markup).toContain('No assets found')
  })
})
