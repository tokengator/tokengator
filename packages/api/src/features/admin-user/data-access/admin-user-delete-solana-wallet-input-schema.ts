import z from 'zod'

export const adminUserDeleteSolanaWalletInputSchema = z.object({
  solanaWalletId: z.string().min(1),
  userId: z.string().min(1),
})
