import z from 'zod'

import { adminAssetGroupTypeSchema } from './admin-asset-group-type'

const decimalsSchema = z.number().int().min(0).max(255).optional()

export const adminAssetGroupUpdateInputSchema = z.object({
  assetGroupId: z.string().min(1),
  data: z.object({
    address: z.string().trim().min(1),
    decimals: decimalsSchema,
    enabled: z.boolean(),
    imageUrl: z.string().trim().nullable().optional(),
    label: z.string().trim().min(1),
    symbol: z.string().trim().nullable().optional(),
    type: adminAssetGroupTypeSchema,
  }),
})
