import z from 'zod'

export const adminCommunityRoleListDiscordGuildRolesInputSchema = z.object({
  organizationId: z.string().min(1),
})
