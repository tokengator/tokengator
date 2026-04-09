import z from 'zod'
import { adminAssetGroupUpdateInputSchema } from './admin-asset-group-update-input-schema'

export type AdminAssetGroupUpdateInput = z.infer<typeof adminAssetGroupUpdateInputSchema>
