import { listAssetGroupIndexRuns } from '../../../features/asset-group-index'

import type { AdminAssetGroupListIndexRunsInput } from './admin-asset-group-list-index-runs-input'

export async function adminAssetGroupListIndexRuns(input: AdminAssetGroupListIndexRunsInput) {
  return await listAssetGroupIndexRuns({
    assetGroupId: input.assetGroupId,
    limit: input.limit ?? 10,
  })
}
