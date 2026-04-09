import z from 'zod'

export const adminOrganizationCreateInputSchema = z.object({
  logo: z.string().optional(),
  name: z.string().trim().min(1),
  ownerUserId: z.string().min(1),
  slug: z.string().trim().min(1),
})
