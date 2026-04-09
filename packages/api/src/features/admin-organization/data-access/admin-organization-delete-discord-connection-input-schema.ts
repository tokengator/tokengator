import z from 'zod'

export const adminOrganizationDeleteDiscordConnectionInputSchema = z.object({
  organizationId: z.string().min(1),
})
