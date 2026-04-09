import z from 'zod'

import { adminCommunityRolePreviewSyncInputSchema } from './admin-community-role-preview-sync-input-schema'

export type AdminCommunityRolePreviewSyncInput = z.infer<typeof adminCommunityRolePreviewSyncInputSchema>
