import z from 'zod'

export const adminCommunityRoleListInputSchema = z.object({
  organizationId: z.string().min(1),
})
