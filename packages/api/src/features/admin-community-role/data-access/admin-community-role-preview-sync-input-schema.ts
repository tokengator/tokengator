import z from 'zod'

export const adminCommunityRolePreviewSyncInputSchema = z.object({
  organizationId: z.string().min(1),
})
