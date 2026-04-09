import z from 'zod'

export const adminCommunityRoleListRunsInputSchema = z.object({
  kind: z.enum(['discord', 'membership']),
  limit: z.number().int().max(50).min(1).optional(),
  organizationId: z.string().min(1),
})
