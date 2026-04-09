import z from 'zod'

import { adminOrganizationUpdateInputSchema } from './admin-organization-update-input-schema'

export type AdminOrganizationUpdateInput = z.infer<typeof adminOrganizationUpdateInputSchema>
