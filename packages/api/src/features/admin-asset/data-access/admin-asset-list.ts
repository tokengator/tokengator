import { and, asc, count, eq, sql } from 'drizzle-orm'
import { type Database, db } from '@tokengator/db'
import { asset, assetGroup } from '@tokengator/db/schema/asset'

import { adminAssetSearchTerm } from '../util/admin-asset-search-pattern'

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

  const addressTerm = adminAssetSearchTerm(input.address)
  const filters = [eq(asset.assetGroupId, input.assetGroupId)]
  const limit = input.limit ?? 50
  const offset = input.offset ?? 0
  const ownerTerm = adminAssetSearchTerm(input.owner)

  if (addressTerm) {
    filters.push(sql`instr(trim(${asset.address}), ${addressTerm}) > 0`)
  }

  if (ownerTerm) {
    filters.push(sql`instr(trim(${asset.owner}), ${ownerTerm}) > 0`)
  }

  if (input.resolverKind) {
    filters.push(eq(asset.resolverKind, input.resolverKind))
  }

  const whereClause = and(...filters)
  const assets = await db
    .select(adminAssetEntityColumns)
    .from(asset)
    .where(whereClause)
    .orderBy(asc(asset.owner), asc(asset.address), asc(asset.resolverKind))
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
