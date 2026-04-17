import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationSetDiscordAnnouncementEnabled as adminOrganizationSetDiscordAnnouncementEnabledDataAccess } from '../data-access/admin-organization-set-discord-announcement-enabled'
import { adminOrganizationSetDiscordAnnouncementEnabledInputSchema } from '../data-access/admin-organization-set-discord-announcement-enabled-input-schema'

export const adminOrganizationFeatureSetDiscordAnnouncementEnabled = adminProcedure
  .input(adminOrganizationSetDiscordAnnouncementEnabledInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationSetDiscordAnnouncementEnabledDataAccess(input)

    if (result.status === 'organization-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    if (result.status === 'discord-announcement-config-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Discord announcement config not found.',
      })
    }

    return result.config
  })
