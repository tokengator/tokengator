import z from 'zod'

import { adminCommunityRoleConditionInputSchema } from './admin-community-role-condition-input-schema'

export type AdminCommunityRoleConditionInput = z.infer<typeof adminCommunityRoleConditionInputSchema>
