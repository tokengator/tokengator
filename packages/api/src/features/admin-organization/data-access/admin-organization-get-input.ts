import z from 'zod'

import { adminOrganizationGetInputSchema } from './admin-organization-get-input-schema'

export type AdminOrganizationGetInput = z.infer<typeof adminOrganizationGetInputSchema>
