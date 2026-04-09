import z from 'zod'

import { adminCommunityRoleApplySyncInputSchema } from './admin-community-role-apply-sync-input-schema'

export type AdminCommunityRoleApplySyncInput = z.infer<typeof adminCommunityRoleApplySyncInputSchema>
