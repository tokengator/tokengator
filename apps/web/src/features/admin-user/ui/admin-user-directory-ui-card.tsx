import type { ReactNode } from 'react'
import type { AdminUserListEntity } from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'
import { formatDate } from '@tokengator/ui/util/format-date'

export function AdminUserDirectoryUiCard(props: {
  assetCount: AdminUserListEntity['assetCount']
  banned: AdminUserListEntity['banned']
  communityCount: AdminUserListEntity['communityCount']
  createdAt: AdminUserListEntity['createdAt']
  email: AdminUserListEntity['email']
  identityCount: AdminUserListEntity['identityCount']
  manageAction: ReactNode
  name: ReactNode
  role: AdminUserListEntity['role']
  userId: AdminUserListEntity['id']
  username: AdminUserListEntity['username']
  walletCount: AdminUserListEntity['walletCount']
}) {
  const {
    assetCount,
    banned,
    communityCount,
    createdAt,
    email,
    identityCount,
    manageAction,
    name,
    role,
    userId,
    username,
    walletCount,
  } = props

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>{name}</CardTitle>
            <CardDescription>
              {username ? `@${username} · ` : ''}
              {email}
            </CardDescription>
          </div>
          {manageAction}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <UiDetailRow label="Role:">{role}</UiDetailRow>
        <UiDetailRow label="Status:">{banned ? 'Banned' : 'Active'}</UiDetailRow>
        <UiDetailRow label="Communities:">{communityCount}</UiDetailRow>
        <UiDetailRow label="Identities:">{identityCount}</UiDetailRow>
        <UiDetailRow label="Assets:">{assetCount}</UiDetailRow>
        <UiDetailRow label="Wallets:">{walletCount}</UiDetailRow>
        <UiDetailRow label="Created:">{formatDate(createdAt)}</UiDetailRow>
        <UiDetailRow label="User ID:">{userId}</UiDetailRow>
      </CardContent>
    </Card>
  )
}
