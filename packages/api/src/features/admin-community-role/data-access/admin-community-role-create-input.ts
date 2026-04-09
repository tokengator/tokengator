import z from 'zod'

import { adminCommunityRoleCreateInputSchema } from './admin-community-role-create-input-schema'

export type AdminCommunityRoleCreateInput = z.infer<typeof adminCommunityRoleCreateInputSchema>
