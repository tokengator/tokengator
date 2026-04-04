import { createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureRolesEntry } from '@/features/admin-community/feature/admin-community-feature-roles-entry'
import { Route as CommunityRoute } from './route'

export const Route = createFileRoute('/admin/communities/$organizationId/roles')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organization } = CommunityRoute.useRouteContext()

  if (!organization) {
    return null
  }

  return <AdminCommunityFeatureRolesEntry organizationId={organization.id} />
}
