import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'

import { adminAssetGroupEntityColumns, toAdminAssetGroupEntity } from './admin-asset-group.entity'

export async function adminAssetGroupGet(assetGroupId: string) {
  const [record] = await db
    .select(adminAssetGroupEntityColumns)
    .from(assetGroup)
    .where(eq(assetGroup.id, assetGroupId))
    .limit(1)

  return record ? toAdminAssetGroupEntity(record) : null
}
