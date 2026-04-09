import z from 'zod'

export const adminCommunityRolePreviewDiscordRoleSyncInputSchema = z.object({
  organizationId: z.string().min(1),
})
