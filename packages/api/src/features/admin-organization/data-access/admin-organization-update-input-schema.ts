import z from 'zod'

export const adminOrganizationUpdateInputSchema = z.object({
  data: z.object({
    logo: z.string().optional(),
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1),
  }),
  organizationId: z.string().min(1),
})
