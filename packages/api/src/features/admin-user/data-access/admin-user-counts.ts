import { count, inArray, sql } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset } from '@tokengator/db/schema/asset'
import { identity, member, solanaWallet } from '@tokengator/db/schema/auth'

function normalizeWalletAddress(address: string) {
  return address.trim()
}

async function adminUserAssetCountsGet(userIds: string[]) {
  const countsByUserId = new Map<string, number>()

  if (userIds.length === 0) {
    return countsByUserId
  }

  const walletRows = await db
    .select({
      address: solanaWallet.address,
      userId: solanaWallet.userId,
    })
    .from(solanaWallet)
    .where(inArray(solanaWallet.userId, userIds))

  if (walletRows.length === 0) {
    return countsByUserId
  }

  const walletUserIdsByAddress = new Map<string, string | null>()
  const walletAddresses = [...new Set(walletRows.map((walletRow) => normalizeWalletAddress(walletRow.address)))]

  for (const walletRow of walletRows) {
    const normalizedAddress = normalizeWalletAddress(walletRow.address)
    const existingUserId = walletUserIdsByAddress.get(normalizedAddress)

    if (existingUserId === undefined) {
      walletUserIdsByAddress.set(normalizedAddress, walletRow.userId)
      continue
    }

    if (existingUserId !== walletRow.userId) {
      walletUserIdsByAddress.set(normalizedAddress, null)
    }
  }

  const normalizedAssetOwner = sql<string>`trim(${asset.owner})`
  const assetRows = await db
    .select({
      count: count(),
      owner: normalizedAssetOwner,
    })
    .from(asset)
    .where(inArray(normalizedAssetOwner, walletAddresses))
    .groupBy(normalizedAssetOwner)

  for (const assetRow of assetRows) {
    const ownerUserId = walletUserIdsByAddress.get(assetRow.owner)

    if (!ownerUserId) {
      continue
    }

    countsByUserId.set(ownerUserId, (countsByUserId.get(ownerUserId) ?? 0) + assetRow.count)
  }

  return countsByUserId
}

async function adminUserGroupedCountsGet(args: {
  table: typeof identity | typeof member | typeof solanaWallet
  userIds: string[]
}) {
  const { table, userIds } = args

  if (userIds.length === 0) {
    return new Map<string, number>()
  }

  const rows = await db
    .select({
      count: count(),
      userId: table.userId,
    })
    .from(table)
    .where(inArray(table.userId, userIds))
    .groupBy(table.userId)

  return new Map(rows.map((row) => [row.userId, row.count] as const))
}

export async function adminUserCountsGet(userIds: string[]) {
  const [assetCounts, communityCounts, identityCounts, walletCounts] = await Promise.all([
    adminUserAssetCountsGet(userIds),
    adminUserGroupedCountsGet({
      table: member,
      userIds,
    }),
    adminUserGroupedCountsGet({
      table: identity,
      userIds,
    }),
    adminUserGroupedCountsGet({
      table: solanaWallet,
      userIds,
    }),
  ])

  return {
    assetCounts,
    communityCounts,
    identityCounts,
    walletCounts,
  }
}
