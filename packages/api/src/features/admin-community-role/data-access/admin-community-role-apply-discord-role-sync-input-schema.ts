import z from 'zod'

export const adminCommunityRoleApplyDiscordRoleSyncInputSchema = z.object({
  organizationId: z.string().min(1),
})
