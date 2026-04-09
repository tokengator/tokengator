import z from 'zod'

import { adminCommunityRoleInputSchema } from './admin-community-role-input-schema'

export const adminCommunityRoleUpdateInputSchema = z.object({
  communityRoleId: z.string().min(1),
  data: adminCommunityRoleInputSchema,
})
