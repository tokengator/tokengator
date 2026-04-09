import z from 'zod'
import { adminAssetGroupDeleteInputSchema } from './admin-asset-group-delete-input-schema'

export type AdminAssetGroupDeleteInput = z.infer<typeof adminAssetGroupDeleteInputSchema>
