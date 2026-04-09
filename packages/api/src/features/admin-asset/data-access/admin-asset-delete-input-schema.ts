import z from 'zod'

export const adminAssetDeleteInputSchema = z.object({
  id: z.string().min(1),
})
