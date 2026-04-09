import z from 'zod'

import { adminCommunityRoleInputSchema } from './admin-community-role-input-schema'

export const adminCommunityRoleCreateInputSchema = z.object({
  data: adminCommunityRoleInputSchema,
  organizationId: z.string().min(1),
})
