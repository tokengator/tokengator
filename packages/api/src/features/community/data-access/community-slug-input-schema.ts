import z from 'zod'

export const communitySlugInputSchema = z.object({
  slug: z.string().trim().min(1),
})
