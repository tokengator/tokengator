import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { solanaWallet } from '@tokengator/db/schema/auth'

import type { ProfileSolanaWalletSetPrimaryInput } from './profile-solana-wallet-set-primary-input'
import { profileSolanaWalletRecordGet } from './profile-solana-wallet-record-get'
import { profileUserIdentitiesReconcileBestEffort } from './profile-user-identities-reconcile-best-effort'
import { toProfileSolanaWalletEntity } from './profile.entity'

export async function profileSolanaWalletSetPrimary(input: {
  requestHeaders?: Headers
  solanaWallet: ProfileSolanaWalletSetPrimaryInput
  userId: string
}) {
  const walletRecord = await profileSolanaWalletRecordGet({
    solanaWalletId: input.solanaWallet.id,
    userId: input.userId,
  })

  if (!walletRecord) {
    return {
      status: 'solana-wallet-not-found' as const,
    }
  }

  if (!walletRecord.isPrimary) {
    await db.transaction(async (transaction) => {
      await transaction
        .update(solanaWallet)
        .set({
          isPrimary: false,
        })
        .where(eq(solanaWallet.userId, walletRecord.userId))

      await transaction
        .update(solanaWallet)
        .set({
          isPrimary: true,
        })
        .where(eq(solanaWallet.id, walletRecord.id))
    })
  }

  await profileUserIdentitiesReconcileBestEffort({
    requestHeaders: input.requestHeaders,
    userId: input.userId,
  })

  return {
    solanaWallet: toProfileSolanaWalletEntity({
      address: walletRecord.address,
      id: walletRecord.id,
      isPrimary: true,
      name: walletRecord.name,
    }),
    status: 'success' as const,
  }
}
