import z from 'zod'

import { adminOrganizationCreateInputSchema } from './admin-organization-create-input-schema'

export type AdminOrganizationCreateInput = z.infer<typeof adminOrganizationCreateInputSchema>
