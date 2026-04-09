import z from 'zod'

export const adminAssetGroupGetInputSchema = z.object({
  assetGroupId: z.string().min(1),
})
