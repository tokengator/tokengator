import type { ReactNode } from 'react'
import type { AdminUserListEntity } from '@tokengator/sdk'

import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { AdminUserDirectoryUiCard } from './admin-user-directory-ui-card'

export function AdminUserDirectoryUiList(props: {
  isSearchActive?: boolean
  renderManageAction: (user: AdminUserListEntity) => ReactNode
  renderTitle?: (user: AdminUserListEntity) => ReactNode
  users: AdminUserListEntity[]
}) {
  const { isSearchActive = false, renderManageAction, renderTitle, users } = props

  if (!users.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isSearchActive ? 'No results found' : 'No Users'}</CardTitle>
          <CardDescription>
            {isSearchActive ? 'Try adjusting your search terms.' : 'No users matched this admin view yet.'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {users.map((user) => (
        <AdminUserDirectoryUiCard
          assetCount={user.assetCount}
          banned={user.banned}
          communityCount={user.communityCount}
          createdAt={user.createdAt}
          email={user.email}
          identityCount={user.identityCount}
          key={user.id}
          manageAction={renderManageAction(user)}
          name={renderTitle ? renderTitle(user) : user.name}
          role={user.role}
          userId={user.id}
          username={user.username}
          walletCount={user.walletCount}
        />
      ))}
    </div>
  )
}
