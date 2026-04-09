import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { solanaWallet } from '@tokengator/db/schema/auth'

import { profileSolanaWalletNameNormalize } from '../util/profile-solana-wallet-name-normalize'

import type { ProfileSolanaWalletUpdateInput } from './profile-solana-wallet-update-input'
import { profileSolanaWalletRecordGet } from './profile-solana-wallet-record-get'
import { profileUserIdentitiesReconcileBestEffort } from './profile-user-identities-reconcile-best-effort'
import { toProfileSolanaWalletEntity } from './profile.entity'

export async function profileSolanaWalletUpdate(input: {
  requestHeaders?: Headers
  solanaWallet: ProfileSolanaWalletUpdateInput
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

  const nextName = profileSolanaWalletNameNormalize(input.solanaWallet.name)
  const [updatedWallet] = await db
    .update(solanaWallet)
    .set({
      name: nextName,
    })
    .where(eq(solanaWallet.id, walletRecord.id))
    .returning({
      address: solanaWallet.address,
      id: solanaWallet.id,
      isPrimary: solanaWallet.isPrimary,
      name: solanaWallet.name,
    })

  await profileUserIdentitiesReconcileBestEffort({
    requestHeaders: input.requestHeaders,
    userId: input.userId,
  })

  return {
    solanaWallet: toProfileSolanaWalletEntity(updatedWallet ?? { ...walletRecord, name: nextName }),
    status: 'success' as const,
  }
}
