import { and, asc, count, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset } from '@tokengator/db/schema/asset'
import { solanaWallet } from '@tokengator/db/schema/auth'

import type { AdminUserListAssetsInput } from './admin-user-list-assets-input'
import { adminUserRecordGet } from './admin-user-record-get'
import { adminUserAssetEntityColumns, toAdminUserAssetEntity } from './admin-user.entity'

function normalizeWalletAddress(address: string) {
  return address.trim()
}

export async function adminUserListAssets(input: AdminUserListAssetsInput) {
  const existingUser = await adminUserRecordGet(input.userId)

  if (!existingUser) {
    return null
  }

  const limit = input.limit ?? 25
  const offset = input.offset ?? 0
  const walletRows = await db
    .select({
      address: solanaWallet.address,
    })
    .from(solanaWallet)
    .where(eq(solanaWallet.userId, input.userId))
    .orderBy(asc(solanaWallet.address))
  const walletAddresses = [...new Set(walletRows.map((walletRow) => normalizeWalletAddress(walletRow.address)))]

  if (walletAddresses.length === 0) {
    return {
      assets: [],
      limit,
      offset,
      total: 0,
    }
  }

  const whereClause = and(inArray(sql<string>`trim(${asset.owner})`, walletAddresses))
  const [assetRows, totalRows] = await Promise.all([
    db
      .select(adminUserAssetEntityColumns)
      .from(asset)
      .where(whereClause)
      .orderBy(asc(asset.address), asc(asset.owner), asc(asset.resolverKind), asc(asset.id))
      .limit(limit)
      .offset(offset),
    db
      .select({
        count: count(),
      })
      .from(asset)
      .where(whereClause),
  ])

  return {
    assets: assetRows.map(toAdminUserAssetEntity),
    limit,
    offset,
    total: totalRows[0]?.count ?? 0,
  }
}
