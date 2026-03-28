import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AdminAssetFeatureGroupShell } from '@/features/admin-asset/feature/admin-asset-feature-group-shell'

export const Route = createFileRoute('/admin/assets/$assetGroupId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { assetGroupId } = Route.useParams()

  return (
    <AdminAssetFeatureGroupShell assetGroupId={assetGroupId}>
      <Outlet />
    </AdminAssetFeatureGroupShell>
  )
}
