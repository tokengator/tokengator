import z from 'zod'

export const adminCommunityRoleSetDiscordRoleMappingInputSchema = z.object({
  communityRoleId: z.string().min(1),
  discordRoleId: z.string().trim().min(1).nullable(),
})
