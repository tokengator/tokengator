import { createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureOperationsEntry } from '@/features/admin-community/feature/admin-community-feature-operations-entry'
import { Route as CommunityRoute } from './route'

export const Route = createFileRoute('/admin/communities/$organizationId/operations')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organization } = CommunityRoute.useRouteContext()

  if (!organization) {
    return null
  }

  return <AdminCommunityFeatureOperationsEntry organizationId={organization.id} />
}
