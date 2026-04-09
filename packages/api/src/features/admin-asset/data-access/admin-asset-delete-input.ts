import z from 'zod'
import { adminAssetDeleteInputSchema } from './admin-asset-delete-input-schema'

export type AdminAssetDeleteInput = z.infer<typeof adminAssetDeleteInputSchema>
