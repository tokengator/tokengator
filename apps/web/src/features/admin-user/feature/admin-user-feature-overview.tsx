import type { AdminUserDetailEntity } from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'
import { formatDate } from '@tokengator/ui/util/format-date'

import { useAdminUserGetQuery } from '../data-access/use-admin-user-get-query'

export function AdminUserFeatureOverview({ initialUser }: { initialUser: AdminUserDetailEntity }) {
  const user = useAdminUserGetQuery(initialUser.id, {
    initialData: initialUser,
  })
  const currentUser = user.data ?? initialUser

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Review the account state and high-level linked data counts.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <UiDetailRow label="Name:">{currentUser.name}</UiDetailRow>
        <UiDetailRow label="Username:">{currentUser.username ? `@${currentUser.username}` : 'None'}</UiDetailRow>
        <UiDetailRow label="Email:">{currentUser.email}</UiDetailRow>
        <UiDetailRow label="Role:">{currentUser.role}</UiDetailRow>
        <UiDetailRow label="Status:">{currentUser.banned ? 'Banned' : 'Active'}</UiDetailRow>
        <UiDetailRow label="Email Verified:">{currentUser.emailVerified ? 'Yes' : 'No'}</UiDetailRow>
        <UiDetailRow label="Ban Reason:">{currentUser.banReason ?? 'None'}</UiDetailRow>
        <UiDetailRow label="Ban Expires:">
          {currentUser.banExpires ? formatDate(currentUser.banExpires) : 'Never'}
        </UiDetailRow>
        <UiDetailRow label="Identities:">{currentUser.identityCount}</UiDetailRow>
        <UiDetailRow label="Wallets:">{currentUser.walletCount}</UiDetailRow>
        <UiDetailRow label="Communities:">{currentUser.communityCount}</UiDetailRow>
        <UiDetailRow label="Assets:">{currentUser.assetCount}</UiDetailRow>
        <UiDetailRow label="Created:">{formatDate(currentUser.createdAt)}</UiDetailRow>
        <UiDetailRow label="Updated:">{formatDate(currentUser.updatedAt)}</UiDetailRow>
      </CardContent>
    </Card>
  )
}
