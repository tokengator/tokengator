import z from 'zod'

export const adminOrganizationGetInputSchema = z.object({
  organizationId: z.string().min(1),
})
