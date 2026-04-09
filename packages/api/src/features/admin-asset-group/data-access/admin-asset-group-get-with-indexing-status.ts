import { getAssetGroupIndexStatusSummaries } from '../../../features/asset-group-index'

import { adminAssetGroupGet } from './admin-asset-group-get'
import { toAdminAssetGroupWithIndexingStatus } from './admin-asset-group.entity'

export async function adminAssetGroupGetWithIndexingStatus(assetGroupId: string) {
  const assetGroup = await adminAssetGroupGet(assetGroupId)

  if (!assetGroup) {
    return null
  }

  const indexingStatus =
    (
      await getAssetGroupIndexStatusSummaries({
        assetGroupIds: [assetGroupId],
      })
    ).get(assetGroupId) ?? null

  return toAdminAssetGroupWithIndexingStatus({
    assetGroup,
    indexingStatus,
  })
}
