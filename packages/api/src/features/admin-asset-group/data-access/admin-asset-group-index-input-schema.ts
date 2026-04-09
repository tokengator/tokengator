import z from 'zod'

export const adminAssetGroupIndexInputSchema = z.object({
  assetGroupId: z.string().min(1),
})
