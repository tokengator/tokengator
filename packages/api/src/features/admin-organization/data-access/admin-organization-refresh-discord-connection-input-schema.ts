import z from 'zod'

export const adminOrganizationRefreshDiscordConnectionInputSchema = z.object({
  organizationId: z.string().min(1),
})
