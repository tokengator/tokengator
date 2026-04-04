import type { ReactNode } from 'react'

import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import type { AppSessionUser } from '@/features/auth/data-access/get-app-auth-state'

import { AdminCommunityDirectoryUiCard } from './admin-community-directory-ui-card'

interface AdminCommunityDirectoryUiListOrganization {
  createdAt: Date | string
  id: string
  memberCount: number
  name: string
  owners: Array<Pick<AppSessionUser, 'name' | 'username'>>
  slug: string
}

interface AdminCommunityDirectoryUiListProps {
  isSearchActive?: boolean
  organizations: AdminCommunityDirectoryUiListOrganization[]
  renderManageAction: (organization: AdminCommunityDirectoryUiListOrganization) => ReactNode
  renderTitle?: (organization: AdminCommunityDirectoryUiListOrganization) => ReactNode
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
