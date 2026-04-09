import z from 'zod'
import { adminAssetGroupIndexInputSchema } from './admin-asset-group-index-input-schema'

export type AdminAssetGroupIndexInput = z.infer<typeof adminAssetGroupIndexInputSchema>
