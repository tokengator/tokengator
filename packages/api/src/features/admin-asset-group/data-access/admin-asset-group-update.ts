import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'

import {
  getDefaultAdminAssetGroupResolverKind,
  isAdminAssetGroupResolverKindCompatible,
  normalizeAdminAssetGroupResolverKind,
} from './admin-asset-group-resolver-kind'
import type { AdminAssetGroupUpdateInput } from './admin-asset-group-update-input'
import type { AdminAssetGroupEntity } from './admin-asset-group.entity'

function normalizeOptionalDecimals(value: number | undefined) {
  return typeof value === 'number' ? value : 0
}

function normalizeOptionalString(value: string | null | undefined) {
  return value?.trim() || null
}

export async function adminAssetGroupUpdate(input: {
  assetGroupId: string
  data: AdminAssetGroupUpdateInput['data']
  existingAssetGroup: AdminAssetGroupEntity
}) {
  const updatedAt = new Date()
  const decimals =
    input.data.decimals === undefined
      ? input.existingAssetGroup.decimals
      : normalizeOptionalDecimals(input.data.decimals)
  const imageUrl =
    input.data.imageUrl === undefined ? input.existingAssetGroup.imageUrl : normalizeOptionalString(input.data.imageUrl)
  const symbol =
    input.data.symbol === undefined ? input.existingAssetGroup.symbol : normalizeOptionalString(input.data.symbol)
  const symbolMagicEden =
    input.data.symbolMagicEden === undefined
      ? input.existingAssetGroup.symbolMagicEden
      : normalizeOptionalString(input.data.symbolMagicEden)
  const resolverKind =
    input.data.resolverKind === undefined
      ? isAdminAssetGroupResolverKindCompatible({
          resolverKind: input.existingAssetGroup.resolverKind,
          type: input.data.type,
        })
        ? input.existingAssetGroup.resolverKind
        : getDefaultAdminAssetGroupResolverKind(input.data.type)
      : normalizeAdminAssetGroupResolverKind({
          resolverKind: input.data.resolverKind,
          type: input.data.type,
        })

  await db
    .update(assetGroup)
    .set({
      address: input.data.address,
      decimals,
      enabled: input.data.enabled,
      imageUrl,
      label: input.data.label,
      resolverKind,
      symbol,
      symbolMagicEden,
      type: input.data.type,
      updatedAt,
    })
    .where(eq(assetGroup.id, input.assetGroupId))

  return {
    ...input.existingAssetGroup,
    address: input.data.address,
    decimals,
    enabled: input.data.enabled,
    imageUrl,
    label: input.data.label,
    resolverKind,
    symbol,
    symbolMagicEden,
    type: input.data.type,
    updatedAt,
  }
}
