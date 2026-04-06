import { createFileRoute } from '@tanstack/react-router'

import { AdminAssetFeatureGroupAssets } from '@/features/admin-asset/feature/admin-asset-feature-group-assets'
import { validateAdminAssetListSearch } from '@/features/admin-asset/util/admin-asset-list-search'

export const Route = createFileRoute('/admin/assets/$assetGroupId/assets')({
  component: RouteComponent,
  validateSearch: validateAdminAssetListSearch,
})

function RouteComponent() {
  const { assetGroupId } = Route.useParams()
  const search = Route.useSearch()

  return <AdminAssetFeatureGroupAssets assetGroupId={assetGroupId} search={search} />
}
