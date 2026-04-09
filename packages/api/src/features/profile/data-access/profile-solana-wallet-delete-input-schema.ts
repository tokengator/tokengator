import z from 'zod'

export const profileSolanaWalletDeleteInputSchema = z.object({
  id: z.string().min(1),
})
