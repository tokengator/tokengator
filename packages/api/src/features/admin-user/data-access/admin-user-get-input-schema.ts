import z from 'zod'

export const adminUserGetInputSchema = z.object({
  userId: z.string().min(1),
})
