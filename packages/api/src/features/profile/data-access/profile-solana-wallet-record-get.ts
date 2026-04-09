import { and, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { solanaWallet } from '@tokengator/db/schema/auth'

export async function profileSolanaWalletRecordGet(input: { solanaWalletId: string; userId: string }) {
  const [walletRecord] = await db
    .select({
      address: solanaWallet.address,
      id: solanaWallet.id,
      isPrimary: solanaWallet.isPrimary,
      name: solanaWallet.name,
      userId: solanaWallet.userId,
    })
    .from(solanaWallet)
    .where(and(eq(solanaWallet.id, input.solanaWalletId), eq(solanaWallet.userId, input.userId)))
    .limit(1)

  return walletRecord ?? null
}
