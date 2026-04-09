import z from 'zod'

import { adminOrganizationRemoveMemberInputSchema } from './admin-organization-remove-member-input-schema'

export type AdminOrganizationRemoveMemberInput = z.infer<typeof adminOrganizationRemoveMemberInputSchema>
