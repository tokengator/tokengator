import z from 'zod'

import { adminCommunityRoleListRunsInputSchema } from './admin-community-role-list-runs-input-schema'

export type AdminCommunityRoleListRunsInput = z.infer<typeof adminCommunityRoleListRunsInputSchema>
