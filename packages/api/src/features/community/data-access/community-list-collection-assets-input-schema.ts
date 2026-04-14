import z from 'zod'

export const communityListCollectionAssetsInputSchema = z.object({
  address: z.string().trim().min(1),
  owner: z.string().trim().min(1).optional(),
  query: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1),
})
