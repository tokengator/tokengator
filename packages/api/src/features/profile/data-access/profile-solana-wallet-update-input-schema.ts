import z from 'zod'

export const profileSolanaWalletUpdateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
})
