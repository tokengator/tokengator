import { createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureOverview } from '@/features/admin-community/feature/admin-community-feature-overview'

export const Route = createFileRoute('/admin/communities/$organizationId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organizationId } = Route.useParams()

  return <AdminCommunityFeatureOverview organizationId={organizationId} />
}
