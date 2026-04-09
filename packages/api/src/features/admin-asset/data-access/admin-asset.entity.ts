import type { InferSelectModel } from 'drizzle-orm'
import { asset } from '@tokengator/db/schema/asset'

import { parseStoredJsonOrValue } from '../../../lib/stored-json'

export const adminAssetEntityColumns = {
  address: asset.address,
  addressLower: asset.addressLower,
  amount: asset.amount,
  assetGroupId: asset.assetGroupId,
  firstSeenAt: asset.firstSeenAt,
  id: asset.id,
  indexedAssetId: asset.indexedAssetId,
  indexedAt: asset.indexedAt,
  lastSeenAt: asset.lastSeenAt,
  metadata: asset.metadata,
  metadataDescription: asset.metadataDescription,
  metadataImageUrl: asset.metadataImageUrl,
  metadataJson: asset.metadataJson,
  metadataJsonUrl: asset.metadataJsonUrl,
  metadataName: asset.metadataName,
  metadataProgramAccount: asset.metadataProgramAccount,
  metadataSymbol: asset.metadataSymbol,
  owner: asset.owner,
  ownerLower: asset.ownerLower,
  page: asset.page,
  raw: asset.raw,
  resolverId: asset.resolverId,
  resolverKind: asset.resolverKind,
}

type AdminAssetRecord = Pick<InferSelectModel<typeof asset>, keyof typeof adminAssetEntityColumns>

export function toAdminAssetEntity(record: AdminAssetRecord) {
  return {
    ...record,
    metadata: parseStoredJsonOrValue(record.metadata),
    metadataJson: parseStoredJsonOrValue(record.metadataJson),
    raw: parseStoredJsonOrValue(record.raw),
  }
}

export type AdminAssetEntity = ReturnType<typeof toAdminAssetEntity>
