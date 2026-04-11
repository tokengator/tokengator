import z from 'zod'

import { adminOrganizationMemberRoleSchema } from '../../admin-organization/data-access/admin-organization-member-role'

export const adminUserCommunityMembershipUpdateInputSchema = z.object({
  memberId: z.string().min(1),
  role: adminOrganizationMemberRoleSchema,
  userId: z.string().min(1),
})
