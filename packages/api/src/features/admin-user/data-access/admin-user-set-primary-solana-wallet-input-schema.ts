import z from 'zod'

export const adminUserSetPrimarySolanaWalletInputSchema = z.object({
  solanaWalletId: z.string().min(1),
  userId: z.string().min(1),
})
