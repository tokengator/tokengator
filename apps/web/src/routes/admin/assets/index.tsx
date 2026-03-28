import { createFileRoute } from '@tanstack/react-router'

import {
  AdminAssetFeatureGroupList,
  validateAdminAssetGroupListSearch,
} from '@/features/admin-asset/feature/admin-asset-feature-group-list'

export const Route = createFileRoute('/admin/assets/')({
  component: RouteComponent,
  validateSearch: validateAdminAssetGroupListSearch,
})

function RouteComponent() {
  const search = Route.useSearch()

  return <AdminAssetFeatureGroupList search={search} />
}
