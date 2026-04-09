import z from 'zod'

import { adminCommunityRoleDeleteInputSchema } from './admin-community-role-delete-input-schema'

export type AdminCommunityRoleDeleteInput = z.infer<typeof adminCommunityRoleDeleteInputSchema>
