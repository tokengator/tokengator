import z from 'zod'

import { adminCommunityRoleConditionInputSchema } from './admin-community-role-condition-input-schema'

export const adminCommunityRoleInputSchema = z.object({
  conditions: z.array(adminCommunityRoleConditionInputSchema).min(1),
  enabled: z.boolean(),
  matchMode: z.enum(['all', 'any']),
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase letters, numbers, and hyphens only.'),
})
