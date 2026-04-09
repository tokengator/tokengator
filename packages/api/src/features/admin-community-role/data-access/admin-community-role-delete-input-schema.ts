import z from 'zod'

export const adminCommunityRoleDeleteInputSchema = z.object({
  communityRoleId: z.string().min(1),
})
