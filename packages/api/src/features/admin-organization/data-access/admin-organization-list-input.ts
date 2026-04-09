import z from 'zod'

import { adminOrganizationListInputSchema } from './admin-organization-list-input-schema'

export type AdminOrganizationListInput = z.infer<typeof adminOrganizationListInputSchema>
