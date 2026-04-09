import { asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { solanaWallet } from '@tokengator/db/schema/auth'

import { toProfileSolanaWalletEntity } from './profile.entity'

export async function profileSolanaWalletList(userId: string) {
  const walletRecords = await db
    .select({
      address: solanaWallet.address,
      id: solanaWallet.id,
      isPrimary: solanaWallet.isPrimary,
      name: solanaWallet.name,
    })
    .from(solanaWallet)
    .where(eq(solanaWallet.userId, userId))
    .orderBy(asc(solanaWallet.address))

  return {
    solanaWallets: walletRecords.map(toProfileSolanaWalletEntity),
  }
}
