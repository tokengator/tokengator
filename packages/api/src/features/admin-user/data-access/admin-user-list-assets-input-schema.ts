import z from 'zod'

export const adminUserListAssetsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  userId: z.string().min(1),
})
