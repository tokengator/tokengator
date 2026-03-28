import { createFileRoute } from '@tanstack/react-router'

import { AdminAssetFeatureGroupSettings } from '@/features/admin-asset/feature/admin-asset-feature-group-settings'

export const Route = createFileRoute('/admin/assets/$assetGroupId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const { assetGroupId } = Route.useParams()

  return <AdminAssetFeatureGroupSettings assetGroupId={assetGroupId} />
}
