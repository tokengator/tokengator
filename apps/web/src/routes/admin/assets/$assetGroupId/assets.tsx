import { createFileRoute } from '@tanstack/react-router'

import {
  AdminAssetFeatureGroupAssets,
  validateAdminAssetListSearch,
} from '@/features/admin-asset/feature/admin-asset-feature-group-assets'

export const Route = createFileRoute('/admin/assets/$assetGroupId/assets')({
  component: RouteComponent,
  validateSearch: validateAdminAssetListSearch,
})

function RouteComponent() {
  const { assetGroupId } = Route.useParams()
  const search = Route.useSearch()

  return <AdminAssetFeatureGroupAssets assetGroupId={assetGroupId} search={search} />
}
