import { createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureOverview } from '@/features/admin-community/feature/admin-community-feature-overview'
import { Route as CommunityRoute } from './route'

export const Route = createFileRoute('/admin/communities/$organizationId/overview')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organization } = CommunityRoute.useRouteContext()

  if (!organization) {
    return null
  }

  return <AdminCommunityFeatureOverview initialOrganization={organization} />
}
