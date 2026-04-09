import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset } from '@tokengator/db/schema/asset'

import type { AdminAssetDeleteInput } from './admin-asset-delete-input'

async function adminAssetDeleteTarget(id: string) {
  const [record] = await db
    .select({
      assetGroupId: asset.assetGroupId,
      id: asset.id,
    })
    .from(asset)
    .where(eq(asset.id, id))
    .limit(1)

  return record ?? null
}

export async function adminAssetDelete(input: AdminAssetDeleteInput) {
  const existingAsset = await adminAssetDeleteTarget(input.id)

  if (!existingAsset) {
    return null
  }

  await db.delete(asset).where(eq(asset.id, input.id))

  return existingAsset
}
