import z from 'zod'

export const adminUserListInputSchema = z.object({
  search: z.string().optional(),
})
