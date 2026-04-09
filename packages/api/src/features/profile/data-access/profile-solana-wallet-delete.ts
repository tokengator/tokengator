import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { solanaWallet } from '@tokengator/db/schema/auth'

import type { ProfileSolanaWalletDeleteInput } from './profile-solana-wallet-delete-input'
import { profileSolanaWalletRecordGet } from './profile-solana-wallet-record-get'
import { profileUserIdentitiesReconcileBestEffort } from './profile-user-identities-reconcile-best-effort'

export async function profileSolanaWalletDelete(input: {
  requestHeaders?: Headers
  solanaWallet: ProfileSolanaWalletDeleteInput
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

  if (walletRecord.isPrimary) {
    return {
      status: 'solana-wallet-is-primary' as const,
    }
  }

  await db.delete(solanaWallet).where(eq(solanaWallet.id, walletRecord.id))
  await profileUserIdentitiesReconcileBestEffort({
    requestHeaders: input.requestHeaders,
    userId: input.userId,
  })

  return {
    solanaWalletId: walletRecord.id,
    status: 'success' as const,
  }
}
