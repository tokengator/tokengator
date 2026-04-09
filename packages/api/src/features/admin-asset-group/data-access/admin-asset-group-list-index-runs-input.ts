import z from 'zod'
import { adminAssetGroupListIndexRunsInputSchema } from './admin-asset-group-list-index-runs-input-schema'

export type AdminAssetGroupListIndexRunsInput = z.infer<typeof adminAssetGroupListIndexRunsInputSchema>
