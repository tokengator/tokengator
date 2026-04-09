import z from 'zod'

import { adminCommunityRoleInputSchema } from './admin-community-role-input-schema'

export type AdminCommunityRoleInput = z.infer<typeof adminCommunityRoleInputSchema>
