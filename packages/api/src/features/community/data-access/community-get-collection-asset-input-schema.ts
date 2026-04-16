import z from 'zod'

export const communityGetCollectionAssetInputSchema = z.object({
  address: z.string().trim().min(1),
  asset: z.string().trim().min(1),
  slug: z.string().trim().min(1),
})
