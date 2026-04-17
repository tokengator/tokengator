import { and, asc, eq, exists, isNotNull, sql, type SQL } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { solanaWallet, user } from '@tokengator/db/schema/auth'

import {
  toCommunityCollectionOwnerCandidateEntity,
  type CommunityCollectionOwnerCandidateEntity,
} from './community.entity'

function createCommunityCollectionUsernameSearchPattern(value?: string) {
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    return null
  }

  const escapedValue = trimmedValue.toLowerCase().replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')

  return `%${escapedValue}%`
}

function normalizeCommunityCollectionOwnerSearchTerm(value?: string) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : null
}

function sortCommunityCollectionOwnerCandidates(
  candidates: CommunityCollectionOwnerCandidateEntity[],
): CommunityCollectionOwnerCandidateEntity[] {
  return [...candidates].sort(
    (leftCandidate, rightCandidate) =>
      leftCandidate.kind.localeCompare(rightCandidate.kind) ||
      leftCandidate.value.localeCompare(rightCandidate.value) ||
      leftCandidate.name.localeCompare(rightCandidate.name) ||
      (leftCandidate.username ?? '').localeCompare(rightCandidate.username ?? '') ||
      leftCandidate.id.localeCompare(rightCandidate.id) ||
      (leftCandidate.address ?? '').localeCompare(rightCandidate.address ?? ''),
  )
}

export async function communityListCollectionOwnerCandidates(input?: { limit?: number; search?: string }) {
  const limit = input?.limit ?? 10
  const ownerSearchTerm = normalizeCommunityCollectionOwnerSearchTerm(input?.search)
  const usernameSearchPattern = createCommunityCollectionUsernameSearchPattern(input?.search)
  const userFilters: SQL<unknown>[] = [
    isNotNull(user.username),
    exists(
      db
        .select({
          id: solanaWallet.id,
        })
        .from(solanaWallet)
        .where(eq(solanaWallet.userId, user.id)),
    ),
  ]

  if (usernameSearchPattern) {
    userFilters.push(sql`lower(${user.username}) like ${usernameSearchPattern} escape '\\'`)
  }

  const walletQuery = db
    .select({
      address: solanaWallet.address,
      id: solanaWallet.id,
      kind: sql<'wallet'>`'wallet'`,
      name: user.name,
      username: user.username,
      value: solanaWallet.address,
    })
    .from(solanaWallet)
    .innerJoin(user, eq(user.id, solanaWallet.userId))
    .$dynamic()

  if (ownerSearchTerm) {
    walletQuery.where(sql`instr(trim(${solanaWallet.address}), ${ownerSearchTerm}) > 0`)
  }

  const [userRows, walletRows] = await Promise.all([
    db
      .select({
        address: sql<string | null>`null`,
        id: user.id,
        kind: sql<'user'>`'user'`,
        name: user.name,
        username: user.username,
        value: sql<string>`${user.username}`,
      })
      .from(user)
      .where(and(...userFilters))
      .orderBy(asc(user.username), asc(user.name), asc(user.id))
      .limit(limit),
    walletQuery
      .orderBy(asc(solanaWallet.address), asc(user.username), asc(user.name), asc(user.id), asc(solanaWallet.id))
      .limit(limit),
  ])

  return sortCommunityCollectionOwnerCandidates([
    ...userRows.map(toCommunityCollectionOwnerCandidateEntity),
    ...walletRows.map(toCommunityCollectionOwnerCandidateEntity),
  ])
}
