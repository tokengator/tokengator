import z from 'zod'

import { adminOrganizationListOwnerCandidatesInputSchema } from './admin-organization-list-owner-candidates-input-schema'

export type AdminOrganizationListOwnerCandidatesInput = z.infer<typeof adminOrganizationListOwnerCandidatesInputSchema>
