import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let AdminUserFeatureShell: typeof import('../src/features/admin-user/feature/admin-user-feature-shell').AdminUserFeatureShell

const user = {
  assetCount: 0,
  banExpires: null,
  banned: false,
  banReason: null,
  communityCount: 0,
  createdAt: new Date('2026-04-12T00:00:00.000Z'),
  developerMode: false,
  displayUsername: null,
  email: 'alice@example.com',
  emailVerified: true,
  id: 'user-1',
  identityCount: 0,
  image: null,
  name: 'Alice',
  private: false,
  role: 'user' as const,
  updatedAt: new Date('2026-04-12T00:00:00.000Z'),
  username: 'alice',
  walletCount: 0,
}

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
    useLocation: () => ({
      pathname: '/admin/users/user-1/overview',
    }),
    useNavigate: () => async () => undefined,
  }))

  mock.module('../src/features/admin-user/data-access/use-admin-user-get-query', () => ({
    useAdminUserGetQuery: () => ({
      data: user,
      isPending: false,
    }),
  }))

  ;({ AdminUserFeatureShell } = await import('../src/features/admin-user/feature/admin-user-feature-shell'))
})

afterAll(() => {
  mock.restore()
})

describe('AdminUserFeatureShell', () => {
  test('renders the profile item header and view profile action', () => {
    const markup = renderToStaticMarkup(
      <AdminUserFeatureShell initialUser={user}>
        <div>Admin content</div>
      </AdminUserFeatureShell>,
    )

    expect(markup).toContain('Back to users')
    expect(markup).toContain('Alice')
    expect(markup).toContain('@alice')
    expect(markup).toContain('View Profile')
    expect(markup).toContain('Admin content')
  })
})
