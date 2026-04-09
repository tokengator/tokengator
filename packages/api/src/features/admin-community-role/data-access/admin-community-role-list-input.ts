import z from 'zod'

import { adminCommunityRoleListInputSchema } from './admin-community-role-list-input-schema'

export type AdminCommunityRoleListInput = z.infer<typeof adminCommunityRoleListInputSchema>
