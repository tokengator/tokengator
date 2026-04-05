import { createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureMembership } from '@/features/admin-community/feature/admin-community-feature-membership'
import { Route as CommunityRoute } from './route'

export const Route = createFileRoute('/admin/communities/$organizationId/members')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organization } = CommunityRoute.useRouteContext()

  if (!organization) {
    return null
  }

  return <AdminCommunityFeatureMembership initialOrganization={organization} />
}
