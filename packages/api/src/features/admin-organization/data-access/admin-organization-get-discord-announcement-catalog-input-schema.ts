import z from 'zod'

export const adminOrganizationGetDiscordAnnouncementCatalogInputSchema = z.object({
  organizationId: z.string().min(1),
})
