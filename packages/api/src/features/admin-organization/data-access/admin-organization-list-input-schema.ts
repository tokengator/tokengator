import z from 'zod'

export const adminOrganizationListInputSchema = z
  .object({
    limit: z.number().int().max(100).min(1).optional(),
    offset: z.number().int().min(0).optional(),
    search: z.string().trim().min(1).optional(),
  })
  .optional()
