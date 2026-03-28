import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { getAdminOrganizationQueryOptions } from './route'

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString()
}

function formatOwnerSummary(owner: { email: string; name: string; username?: string | null }) {
  return owner.username ? `${owner.name} (@${owner.username}, ${owner.email})` : `${owner.name} (${owner.email})`
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
        <div className="flex flex-col gap-1 md:flex-row md:gap-2">
          <span className="text-muted-foreground">Community ID:</span>
          <span>{organization.data.id}</span>
        </div>
        <div className="flex flex-col gap-1 md:flex-row md:gap-2">
          <span className="text-muted-foreground">Created:</span>
          <span>{formatDate(organization.data.createdAt)}</span>
        </div>
        <div className="flex flex-col gap-1 md:flex-row md:gap-2">
          <span className="text-muted-foreground">Members:</span>
          <span>{organization.data.members.length}</span>
        </div>
        <div className="flex flex-col gap-1 md:flex-row md:gap-2">
          <span className="text-muted-foreground">Owners:</span>
          <span>
            {organization.data.owners.length
              ? organization.data.owners.map(formatOwnerSummary).join(', ')
              : 'No owners found'}
          </span>
        </div>
        <div className="flex flex-col gap-1 md:flex-row md:gap-2">
          <span className="text-muted-foreground">Logo:</span>
          <span>{organization.data.logo ?? 'No logo configured'}</span>
        </div>
      </CardContent>
    </Card>
  )
}
