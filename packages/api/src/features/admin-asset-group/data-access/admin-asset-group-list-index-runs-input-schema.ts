import z from 'zod'

export const adminAssetGroupListIndexRunsInputSchema = z.object({
  assetGroupId: z.string().min(1),
  limit: z.number().int().max(50).min(1).optional(),
})
