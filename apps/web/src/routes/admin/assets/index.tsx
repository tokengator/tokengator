import { createFileRoute } from '@tanstack/react-router'

import { AdminAssetFeatureGroupList } from '@/features/admin-asset/feature/admin-asset-feature-group-list'
import { validateAdminAssetGroupListSearch } from '@/features/admin-asset/util/admin-asset-group-list-search'

export const Route = createFileRoute('/admin/assets/')({
  component: RouteComponent,
  validateSearch: validateAdminAssetGroupListSearch,
})

function RouteComponent() {
  const search = Route.useSearch()

  return <AdminAssetFeatureGroupList search={search} />
}
