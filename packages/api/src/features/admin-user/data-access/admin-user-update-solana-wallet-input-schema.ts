import z from 'zod'

export const adminUserUpdateSolanaWalletInputSchema = z.object({
  name: z.string(),
  solanaWalletId: z.string().min(1),
  userId: z.string().min(1),
})
