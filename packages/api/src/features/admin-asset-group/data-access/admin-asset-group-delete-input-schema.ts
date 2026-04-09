import z from 'zod'

export const adminAssetGroupDeleteInputSchema = z.object({
  assetGroupId: z.string().min(1),
})
