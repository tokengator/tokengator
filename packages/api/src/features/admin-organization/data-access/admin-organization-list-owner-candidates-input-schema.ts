import z from 'zod'

export const adminOrganizationListOwnerCandidatesInputSchema = z
  .object({
    limit: z.number().int().max(20).min(1).optional(),
    search: z.string().trim().min(1).optional(),
  })
  .optional()
