import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'

export async function adminAssetGroupDelete(assetGroupId: string) {
  await db.delete(assetGroup).where(eq(assetGroup.id, assetGroupId))
}
