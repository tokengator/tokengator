import z from 'zod'

import { adminOrganizationUpdateMemberRoleInputSchema } from './admin-organization-update-member-role-input-schema'

export type AdminOrganizationUpdateMemberRoleInput = z.infer<typeof adminOrganizationUpdateMemberRoleInputSchema>
