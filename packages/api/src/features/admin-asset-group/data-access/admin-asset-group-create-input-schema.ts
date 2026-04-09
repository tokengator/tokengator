import z from 'zod'
import { adminAssetGroupTypeSchema } from './admin-asset-group-type'

export const adminAssetGroupCreateInputSchema = z.object({
  address: z.string().trim().min(1),
  enabled: z.boolean().optional(),
  label: z.string().trim().min(1),
  type: adminAssetGroupTypeSchema,
})
