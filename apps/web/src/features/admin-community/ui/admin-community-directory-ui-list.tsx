import type { ReactNode } from 'react'
import type { AdminOrganizationListEntity } from '@tokengator/sdk'

import { CommunityUiItem } from '@/features/community/ui/community-ui-item'
import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { formatDate } from '@tokengator/ui/util/format-date'

import { formatOwnerSummary } from '../util/format-owner-summary.tsx'

interface AdminCommunityDirectoryUiListProps {
  isSearchActive?: boolean
  organizations: AdminOrganizationListEntity[]
  renderManageAction: (organization: AdminOrganizationListEntity) => ReactNode
  renderTitle?: (organization: AdminOrganizationListEntity) => ReactNode
}

export function AdminCommunityDirectoryUiList(props: AdminCommunityDirectoryUiListProps) {
  const { isSearchActive = false, organizations, renderManageAction, renderTitle } = props

  if (!organizations.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isSearchActive ? 'No results found' : 'No Communities'}</CardTitle>
          <CardDescription>
            {isSearchActive
              ? 'Try adjusting your search terms.'
              : 'Create the first community from this admin section.'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {organizations.map((organization) => (
        <CommunityUiItem
          action={renderManageAction(organization)}
          community={organization}
          footer={
            <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
              <span>
                Owners:{' '}
                {organization.owners.length
                  ? organization.owners.map(formatOwnerSummary).join(', ')
                  : 'No owners found'}
              </span>
              <span>Members: {organization.memberCount}</span>
              <span>Created: {formatDate(organization.createdAt)}</span>
            </div>
          }
          key={organization.id}
          title={renderTitle ? renderTitle(organization) : organization.name}
        />
      ))}
    </div>
  )
}
