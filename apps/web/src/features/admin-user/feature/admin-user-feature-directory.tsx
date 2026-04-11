import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Button } from '@tokengator/ui/components/button'

import { useAdminUserDirectoryQuery } from '../data-access/use-admin-user-directory-query'
import { AdminUserDirectoryUiList } from '../ui/admin-user-directory-ui-list'
import { AdminUserDirectoryUiSearch } from '../ui/admin-user-directory-ui-search'

export function AdminUserFeatureDirectory() {
  const [userSearch, setUserSearch] = useState('')
  const deferredUserSearch = useDeferredValue(userSearch)
  const normalizedUserSearch = deferredUserSearch.trim()
  const users = useAdminUserDirectoryQuery({
    search: normalizedUserSearch || undefined,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Users</h2>
          <p className="text-muted-foreground text-sm">
            Manage platform users, linked identities, memberships, and assets.
          </p>
        </div>
      </div>

      <AdminUserDirectoryUiSearch onChange={setUserSearch} value={userSearch} />

      {users.error ? (
        <div className="text-destructive text-sm">{users.error.message}</div>
      ) : users.isPending ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading users
        </div>
      ) : (
        <AdminUserDirectoryUiList
          isSearchActive={Boolean(normalizedUserSearch)}
          renderManageAction={(user) => (
            <Button
              nativeButton={false}
              render={
                <Link
                  params={{
                    userId: user.id,
                  }}
                  to="/admin/users/$userId"
                />
              }
              variant="outline"
            >
              Manage
            </Button>
          )}
          renderTitle={(user) => (
            <Link
              className="hover:text-primary transition-colors"
              params={{
                userId: user.id,
              }}
              to="/admin/users/$userId"
            >
              {user.name}
            </Link>
          )}
          users={users.data?.users ?? []}
        />
      )}
    </div>
  )
}
