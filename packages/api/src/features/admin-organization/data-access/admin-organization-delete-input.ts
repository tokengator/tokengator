import z from 'zod'

import { adminOrganizationDeleteInputSchema } from './admin-organization-delete-input-schema'

export type AdminOrganizationDeleteInput = z.infer<typeof adminOrganizationDeleteInputSchema>
