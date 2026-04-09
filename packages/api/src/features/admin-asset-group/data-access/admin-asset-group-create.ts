import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'

import type { AdminAssetGroupCreateInput } from './admin-asset-group-create-input'
import { adminAssetGroupGet } from './admin-asset-group-get'

export async function adminAssetGroupCreate(input: AdminAssetGroupCreateInput) {
  const id = crypto.randomUUID()
  const now = new Date()

  await db.insert(assetGroup).values({
    address: input.address,
    createdAt: now,
    enabled: input.enabled ?? true,
    id,
    label: input.label,
    type: input.type,
    updatedAt: now,
  })

  return await adminAssetGroupGet(id)
}
