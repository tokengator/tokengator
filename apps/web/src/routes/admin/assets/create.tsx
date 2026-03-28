import { createFileRoute } from '@tanstack/react-router'

import { AdminAssetFeatureGroupCreate } from '@/features/admin-asset/feature/admin-asset-feature-group-create'

export const Route = createFileRoute('/admin/assets/create')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AdminAssetFeatureGroupCreate />
}
