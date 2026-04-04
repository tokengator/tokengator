import { createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureRolesEntry } from '@/features/admin-community/feature/admin-community-feature-roles-entry'

export const Route = createFileRoute('/admin/communities/$organizationId/roles')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organizationId } = Route.useParams()

  return <AdminCommunityFeatureRolesEntry organizationId={organizationId} />
}
