import z from 'zod'

const adminUserUpdateDataSchema = z.object({
  banExpires: z.number().int().nullable().optional(),
  banned: z.boolean().optional(),
  banReason: z.string().nullable().optional(),
  developerMode: z.boolean().optional(),
  email: z.string().email().optional(),
  image: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  private: z.boolean().optional(),
  role: z.enum(['admin', 'user']).optional(),
  username: z.string().nullable().optional(),
})

export const adminUserUpdateInputSchema = z.object({
  data: adminUserUpdateDataSchema,
  userId: z.string().min(1),
})
