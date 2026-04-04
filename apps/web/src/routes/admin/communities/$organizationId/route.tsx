import { Outlet, createFileRoute } from '@tanstack/react-router'

import { getAdminCommunityGetQueryOptions } from '@/features/admin-community/data-access/use-admin-community-get-query'
import { AdminCommunityFeatureShell } from '@/features/admin-community/feature/admin-community-feature-shell'

export const Route = createFileRoute('/admin/communities/$organizationId')({
  beforeLoad: async ({ context, params }) => {
    const organization = await context.queryClient.ensureQueryData(
      getAdminCommunityGetQueryOptions(params.organizationId),
    )

    return { organization }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { organization } = Route.useRouteContext()

  return (
    <AdminCommunityFeatureShell initialOrganization={organization}>
      <Outlet />
    </AdminCommunityFeatureShell>
  )
}
