import z from 'zod'

export const adminCommunityRoleGetSyncStatusInputSchema = z.object({
  organizationId: z.string().min(1),
})
