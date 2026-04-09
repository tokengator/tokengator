import z from 'zod'

export const adminOrganizationDeleteInputSchema = z.object({
  organizationId: z.string().min(1),
})
