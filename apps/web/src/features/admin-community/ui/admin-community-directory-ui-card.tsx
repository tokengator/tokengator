import type { ReactNode } from 'react'
import type { AdminOrganizationListEntity } from '@tokengator/sdk'

import { formatOwnerSummary } from '@/features/admin-community/util/format-owner-summary.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'
import { formatDate } from '@tokengator/ui/util/format-date'

interface AdminCommunityDirectoryUiCardProps {
  createdAt: AdminOrganizationListEntity['createdAt']
  manageAction: ReactNode
  memberCount: AdminOrganizationListEntity['memberCount']
  owners: AdminOrganizationListEntity['owners']
  slug: AdminOrganizationListEntity['slug']
  title: ReactNode
}

export function AdminCommunityDirectoryUiCard(props: AdminCommunityDirectoryUiCardProps) {
  const { createdAt, manageAction, memberCount, owners, slug, title } = props

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{slug}</CardDescription>
          </div>
          {manageAction}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <UiDetailRow label="Owners:">
          {owners.length ? owners.map(formatOwnerSummary).join(', ') : 'No owners found'}
        </UiDetailRow>
        <UiDetailRow label="Members:">{memberCount}</UiDetailRow>
        <UiDetailRow label="Created:">{formatDate(createdAt)}</UiDetailRow>
      </CardContent>
    </Card>
  )
}
