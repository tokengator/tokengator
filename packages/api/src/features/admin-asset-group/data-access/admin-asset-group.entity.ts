import type { InferSelectModel } from 'drizzle-orm'
import { assetGroup } from '@tokengator/db/schema/asset'

import type { AssetGroupIndexStatusSummary } from '../../../features/asset-group-index'

export const adminAssetGroupEntityColumns = {
  address: assetGroup.address,
  createdAt: assetGroup.createdAt,
  enabled: assetGroup.enabled,
  id: assetGroup.id,
  imageUrl: assetGroup.imageUrl,
  indexingStartedAt: assetGroup.indexingStartedAt,
  label: assetGroup.label,
  type: assetGroup.type,
  updatedAt: assetGroup.updatedAt,
}

type AdminAssetGroupRecord = Pick<InferSelectModel<typeof assetGroup>, keyof typeof adminAssetGroupEntityColumns>

export function toAdminAssetGroupEntity(record: AdminAssetGroupRecord) {
  return record
}

export function toAdminAssetGroupWithIndexingStatus(input: {
  assetGroup: AdminAssetGroupEntity
  indexingStatus: AssetGroupIndexStatusSummary | null
}) {
  return {
    ...input.assetGroup,
    indexingStatus: input.indexingStatus,
  }
}

export type AdminAssetGroupEntity = ReturnType<typeof toAdminAssetGroupEntity>
export type AdminAssetGroupWithIndexingStatus = ReturnType<typeof toAdminAssetGroupWithIndexingStatus>
