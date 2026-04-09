import z from 'zod'
import { adminAssetGroupGetInputSchema } from './admin-asset-group-get-input-schema'

export type AdminAssetGroupGetInput = z.infer<typeof adminAssetGroupGetInputSchema>
