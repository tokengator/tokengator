import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationList as adminOrganizationListDataAccess } from '../data-access/admin-organization-list'
import { adminOrganizationListInputSchema } from '../data-access/admin-organization-list-input-schema'

export const adminOrganizationFeatureList = adminProcedure
  .input(adminOrganizationListInputSchema)
  .handler(async ({ input }) => {
    return await adminOrganizationListDataAccess(input)
  })
