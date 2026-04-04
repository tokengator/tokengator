import type { ReactNode } from 'react'

import type { AppSessionUser } from '@/features/auth/data-access/get-app-auth-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

interface AdminCommunityDirectoryUiCardProps {
  createdAt: Date | string
  manageAction: ReactNode
  memberCount: number
  owners: Array<Pick<AppSessionUser, 'name' | 'username'>>
  slug: string
  title: ReactNode
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('en-US')
}

function formatOwnerSummary(owner: AdminCommunityDirectoryUiCardProps['owners'][number]) {
  return owner.username ? `${owner.name} (@${owner.username})` : owner.name
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
        <div className="flex flex-col gap-1 md:flex-row md:gap-2">
          <span className="text-muted-foreground">Owners:</span>
          <span>{owners.length ? owners.map(formatOwnerSummary).join(', ') : 'No owners found'}</span>
        </div>
        <div className="flex flex-col gap-1 md:flex-row md:gap-2">
          <span className="text-muted-foreground">Members:</span>
          <span>{memberCount}</span>
        </div>
        <div className="flex flex-col gap-1 md:flex-row md:gap-2">
          <span className="text-muted-foreground">Created:</span>
          <span>{formatDate(createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
