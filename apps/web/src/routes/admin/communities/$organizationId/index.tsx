import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'

import type { AppSessionUser } from '@/features/auth/data-access/get-app-auth-state'

import { getAdminOrganizationQueryOptions } from './route'

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString()
}

function formatOwnerSummary(owner: Pick<AppSessionUser, 'name' | 'username'>) {
  return owner.username ? `${owner.name} (@${owner.username})` : owner.name
}

export const Route = createFileRoute('/admin/communities/$organizationId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organizationId } = Route.useParams()
  const organization = useQuery(getAdminOrganizationQueryOptions(organizationId))

  if (!organization.data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Reference values for support and auditing.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <UiDetailRow label="Community ID:">{organization.data.id}</UiDetailRow>
        <UiDetailRow label="Created:">{formatDate(organization.data.createdAt)}</UiDetailRow>
        <UiDetailRow label="Members:">{organization.data.members.length}</UiDetailRow>
        <UiDetailRow label="Owners:">
          {organization.data.owners.length
            ? organization.data.owners.map(formatOwnerSummary).join(', ')
            : 'No owners found'}
        </UiDetailRow>
        <UiDetailRow label="Logo:">{organization.data.logo ?? 'No logo configured'}</UiDetailRow>
      </CardContent>
    </Card>
  )
}
