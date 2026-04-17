import z from 'zod'

export const communityListCollectionOwnerCandidatesInputSchema = z
  .object({
    limit: z.number().int().max(10).min(1).optional(),
    search: z.string().trim().min(1).optional(),
  })
  .optional()
