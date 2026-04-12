import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminUserDirectoryUiSearch } from '../src/features/admin-user/ui/admin-user-directory-ui-search'
import { Route as AdminUserIndexRoute } from '../src/routes/admin/users/$userId/index'

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
  test('renders an accessible label for the user directory search', () => {
    const markup = renderToStaticMarkup(<AdminUserDirectoryUiSearch onChange={() => undefined} value="" />)

    expect(markup).toContain('Search users')
    expect(markup).toContain('id="admin-user-directory-search"')
  })
})
