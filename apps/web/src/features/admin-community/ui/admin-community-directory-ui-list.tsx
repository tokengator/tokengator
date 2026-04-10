import type { ReactNode } from 'react'
import type { AdminOrganizationListEntity } from '@tokengator/sdk'

import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { AdminCommunityDirectoryUiCard } from './admin-community-directory-ui-card'

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
        <AdminCommunityDirectoryUiCard
          createdAt={organization.createdAt}
          key={organization.id}
          manageAction={renderManageAction(organization)}
          memberCount={organization.memberCount}
          owners={organization.owners}
          slug={organization.slug}
          title={renderTitle ? renderTitle(organization) : organization.name}
        />
      ))}
    </div>
  )
}
