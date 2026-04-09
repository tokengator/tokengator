import { adminProcedure } from '../../../lib/prodecures'

import { adminOrganizationListOwnerCandidates as adminOrganizationListOwnerCandidatesDataAccess } from '../data-access/admin-organization-list-owner-candidates'
import { adminOrganizationListOwnerCandidatesInputSchema } from '../data-access/admin-organization-list-owner-candidates-input-schema'

export const adminOrganizationFeatureListOwnerCandidates = adminProcedure
  .input(adminOrganizationListOwnerCandidatesInputSchema)
  .handler(async ({ input }) => {
    return await adminOrganizationListOwnerCandidatesDataAccess(input)
  })
