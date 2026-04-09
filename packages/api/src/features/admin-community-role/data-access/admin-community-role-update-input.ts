import z from 'zod'

import { adminCommunityRoleUpdateInputSchema } from './admin-community-role-update-input-schema'

export type AdminCommunityRoleUpdateInput = z.infer<typeof adminCommunityRoleUpdateInputSchema>
