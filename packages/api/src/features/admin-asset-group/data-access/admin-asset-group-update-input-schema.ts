import z from 'zod'

import { adminAssetGroupTypeSchema } from './admin-asset-group-type'

export const adminAssetGroupUpdateInputSchema = z.object({
  assetGroupId: z.string().min(1),
  data: z.object({
    address: z.string().trim().min(1),
    enabled: z.boolean(),
    imageUrl: z.string().trim().nullable().optional(),
    label: z.string().trim().min(1),
    type: adminAssetGroupTypeSchema,
  }),
})
