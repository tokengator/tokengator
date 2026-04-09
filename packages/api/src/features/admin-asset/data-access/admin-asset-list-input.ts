import z from 'zod'
import { adminAssetListInputSchema } from './admin-asset-list-input-schema'

export type AdminAssetListInput = z.infer<typeof adminAssetListInputSchema>
