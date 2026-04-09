import z from 'zod'
import { adminAssetGroupListInputSchema } from './admin-asset-group-list-input-schema'

export type AdminAssetGroupListInput = z.infer<typeof adminAssetGroupListInputSchema>
