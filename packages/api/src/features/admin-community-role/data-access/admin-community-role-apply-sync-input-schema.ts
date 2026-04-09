import z from 'zod'

export const adminCommunityRoleApplySyncInputSchema = z.object({
  organizationId: z.string().min(1),
})
