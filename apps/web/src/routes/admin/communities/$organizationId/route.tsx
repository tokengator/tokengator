import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureShell } from '@/features/admin-community/feature/admin-community-feature-shell'

export const Route = createFileRoute('/admin/communities/$organizationId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organizationId } = Route.useParams()

  return (
    <AdminCommunityFeatureShell organizationId={organizationId}>
      <Outlet />
    </AdminCommunityFeatureShell>
  )
}
