import z from 'zod'

const positiveIntegerSchema = z.string().regex(/^[1-9]\d*$/, 'Amount must be a positive integer.')

export const adminCommunityRoleConditionInputSchema = z.object({
  assetGroupId: z.string().min(1),
  maximumAmount: positiveIntegerSchema
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  minimumAmount: positiveIntegerSchema,
})
