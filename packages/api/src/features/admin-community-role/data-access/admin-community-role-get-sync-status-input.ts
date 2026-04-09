import z from 'zod'

import { adminCommunityRoleGetSyncStatusInputSchema } from './admin-community-role-get-sync-status-input-schema'

export type AdminCommunityRoleGetSyncStatusInput = z.infer<typeof adminCommunityRoleGetSyncStatusInputSchema>
