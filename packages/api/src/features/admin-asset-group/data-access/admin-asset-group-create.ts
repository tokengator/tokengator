import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'

import type { AdminAssetGroupCreateInput } from './admin-asset-group-create-input'
import { adminAssetGroupGet } from './admin-asset-group-get'

function normalizeOptionalDecimals(value: number | undefined) {
  return typeof value === 'number' ? value : 0
}

function normalizeOptionalString(value: string | null | undefined) {
  return value?.trim() || null
}

export async function adminAssetGroupCreate(input: AdminAssetGroupCreateInput) {
  const id = crypto.randomUUID()
  const now = new Date()

  await db.insert(assetGroup).values({
    address: input.address,
    createdAt: now,
    decimals: normalizeOptionalDecimals(input.decimals),
    enabled: input.enabled ?? true,
    id,
    imageUrl: normalizeOptionalString(input.imageUrl),
    label: input.label,
    type: input.type,
    updatedAt: now,
  })

  return await adminAssetGroupGet(id)
}
