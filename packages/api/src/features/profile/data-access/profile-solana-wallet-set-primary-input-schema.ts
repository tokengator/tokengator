import z from 'zod'

export const profileSolanaWalletSetPrimaryInputSchema = z.object({
  id: z.string().min(1),
})
