import { and, eq } from 'drizzle-orm'
import { reconcileLocalUserState } from '@tokengator/auth'
import { db } from '@tokengator/db'
import { account } from '@tokengator/db/schema/auth'

import { adminUserGet } from './admin-user-get'
import type { AdminUserLinkDiscordAccountInput } from './admin-user-link-discord-account-input'
import { adminUserRecordGet } from './admin-user-record-get'

export async function adminUserLinkDiscordAccount(input: AdminUserLinkDiscordAccountInput) {
  const accountId = input.accountId.trim()

  if (!accountId) {
    return {
      status: 'discord-account-id-required' as const,
    }
  }

  const existingUser = await adminUserRecordGet(input.userId)

  if (!existingUser) {
    return {
      status: 'user-not-found' as const,
    }
  }

  const [existingAccount] = await db
    .select({
      id: account.id,
      userId: account.userId,
    })
    .from(account)
    .where(and(eq(account.providerId, 'discord'), eq(account.accountId, accountId)))
    .limit(1)

  if (existingAccount && existingAccount.userId !== input.userId) {
    return {
      status: 'discord-account-linked-to-another-user' as const,
    }
  }

  if (!existingAccount) {
    const now = new Date()

    await db.insert(account).values({
      accountId,
      createdAt: now,
      id: crypto.randomUUID(),
      providerId: 'discord',
      updatedAt: now,
      userId: input.userId,
    })
  }

  await reconcileLocalUserState({
    userId: input.userId,
  })

  const updatedUser = await adminUserGet(input.userId)

  if (!updatedUser) {
    return {
      status: 'user-updated-but-not-loaded' as const,
    }
  }

  return {
    status: 'success' as const,
    user: updatedUser,
  }
}
