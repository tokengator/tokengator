import z from 'zod'

import { adminOrganizationMemberRoleSchema } from './admin-organization-member-role'

export const adminOrganizationUpdateMemberRoleInputSchema = z.object({
  memberId: z.string().min(1),
  role: adminOrganizationMemberRoleSchema,
})
