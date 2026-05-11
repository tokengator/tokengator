import { eq } from 'drizzle-orm'
import { reconcileLocalUserState } from '@tokengator/auth'
import { db } from '@tokengator/db'
import { solanaWallet } from '@tokengator/db/schema/auth'

import { adminUserGet } from './admin-user-get'
import type { AdminUserLinkSolanaWalletInput } from './admin-user-link-solana-wallet-input'
import { adminUserRecordGet } from './admin-user-record-get'

function normalizeOptionalString(value: string | null | undefined) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : null
}

export async function adminUserLinkSolanaWallet(input: AdminUserLinkSolanaWalletInput) {
  const existingUser = await adminUserRecordGet(input.userId)

  if (!existingUser) {
    return {
      status: 'user-not-found' as const,
    }
  }

  const address = input.address.trim()
  const [existingWallet] = await db
    .select({
      id: solanaWallet.id,
      userId: solanaWallet.userId,
    })
    .from(solanaWallet)
    .where(eq(solanaWallet.address, address))
    .limit(1)

  if (existingWallet && existingWallet.userId !== input.userId) {
    return {
      status: 'solana-wallet-linked-to-another-user' as const,
    }
  }

  const walletName = normalizeOptionalString(input.name)

  await db.transaction(async (transaction) => {
    if (input.isPrimary) {
      await transaction.update(solanaWallet).set({ isPrimary: false }).where(eq(solanaWallet.userId, input.userId))
    }

    if (existingWallet) {
      const updateData = {
        ...(input.isPrimary === undefined ? {} : { isPrimary: input.isPrimary }),
        ...(input.name === undefined ? {} : { name: walletName }),
      }

      if (Object.keys(updateData).length === 0) {
        return
      }

      await transaction.update(solanaWallet).set(updateData).where(eq(solanaWallet.id, existingWallet.id))
      return
    }

    const userWallets = await transaction
      .select({
        id: solanaWallet.id,
      })
      .from(solanaWallet)
      .where(eq(solanaWallet.userId, input.userId))
      .limit(1)

    await transaction.insert(solanaWallet).values({
      address,
      id: crypto.randomUUID(),
      isPrimary: input.isPrimary ?? userWallets.length === 0,
      name: walletName,
      userId: input.userId,
    })
  })

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
