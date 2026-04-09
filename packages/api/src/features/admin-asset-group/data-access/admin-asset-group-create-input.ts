import z from 'zod'
import { adminAssetGroupCreateInputSchema } from './admin-asset-group-create-input-schema'

export type AdminAssetGroupCreateInput = z.infer<typeof adminAssetGroupCreateInputSchema>
