import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationGetDiscordAnnouncementCatalog as adminOrganizationGetDiscordAnnouncementCatalogDataAccess } from '../data-access/admin-organization-get-discord-announcement-catalog'
import { adminOrganizationGetDiscordAnnouncementCatalogInputSchema } from '../data-access/admin-organization-get-discord-announcement-catalog-input-schema'

export const adminOrganizationFeatureGetDiscordAnnouncementCatalog = adminProcedure
  .input(adminOrganizationGetDiscordAnnouncementCatalogInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationGetDiscordAnnouncementCatalogDataAccess(input.organizationId)

    if (result.status === 'organization-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return result.catalog
  })
