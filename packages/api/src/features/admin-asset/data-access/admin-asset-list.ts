import { and, asc, count, eq, sql } from 'drizzle-orm'
import { type Database, db } from '@tokengator/db'
import { asset, assetGroup } from '@tokengator/db/schema/asset'

import { adminAssetSearchPattern } from '../util/admin-asset-search-pattern'

import type { AdminAssetListInput } from './admin-asset-list-input'
import { adminAssetEntityColumns, toAdminAssetEntity } from './admin-asset.entity'

async function adminAssetGroupGet(assetGroupId: string) {
  const [record] = await db
    .select({
      id: assetGroup.id,
    })
    .from(assetGroup)
    .where(eq(assetGroup.id, assetGroupId))
    .limit(1)

  return record ?? null
}

export async function adminAssetList(db: Database, input: AdminAssetListInput) {
  const existingAssetGroup = await adminAssetGroupGet(input.assetGroupId)

  if (!existingAssetGroup) {
    return null
  }

  const addressPattern = adminAssetSearchPattern(input.address)
  const filters = [eq(asset.assetGroupId, input.assetGroupId)]
  const limit = input.limit ?? 50
  const offset = input.offset ?? 0
  const ownerPattern = adminAssetSearchPattern(input.owner)

  if (addressPattern) {
    filters.push(sql`${asset.addressLower} like ${addressPattern} escape '\\'`)
  }

  if (ownerPattern) {
    filters.push(sql`${asset.ownerLower} like ${ownerPattern} escape '\\'`)
  }

  if (input.resolverKind) {
    filters.push(eq(asset.resolverKind, input.resolverKind))
  }

  const whereClause = and(...filters)
  const assets = await db
    .select(adminAssetEntityColumns)
    .from(asset)
    .where(whereClause)
    .orderBy(asc(asset.ownerLower), asc(asset.addressLower), asc(asset.resolverKind))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db
    .select({
      count: count(),
    })
    .from(asset)
    .where(whereClause)

  return {
    assets: assets.map(toAdminAssetEntity),
    limit,
    offset,
    total: totalResult?.count ?? 0,
  }
}
