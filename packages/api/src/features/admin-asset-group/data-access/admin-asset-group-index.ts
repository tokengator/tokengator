import { env } from '@tokengator/env/api'

import { indexAssetGroup } from '../../../features/asset-group-index'

import type { AdminAssetGroupEntity } from './admin-asset-group.entity'

export async function adminAssetGroupIndex(input: { assetGroup: AdminAssetGroupEntity; signal?: AbortSignal }) {
  return await indexAssetGroup({
    apiKey: env.HELIUS_API_KEY,
    assetGroup: {
      address: input.assetGroup.address,
      id: input.assetGroup.id,
      type: input.assetGroup.type,
    },
    heliusCluster: env.HELIUS_CLUSTER,
    signal: input.signal,
  })
}
