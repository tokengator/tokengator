import { asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'

import { adminAssetGroupEntityColumns, toAdminAssetGroupEntity } from './admin-asset-group.entity'

export async function adminAssetGroupGetByAddress(address: string) {
  const [record] = await db
    .select(adminAssetGroupEntityColumns)
    .from(assetGroup)
    .where(eq(assetGroup.address, address))
    .orderBy(asc(assetGroup.label), asc(assetGroup.type), asc(assetGroup.address))
    .limit(1)

  return record ? toAdminAssetGroupEntity(record) : null
}
