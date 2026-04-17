import z from 'zod'

export const adminOrganizationSetDiscordRoleSyncEnabledInputSchema = z.object({
  enabled: z.boolean(),
  organizationId: z.string().min(1),
})
