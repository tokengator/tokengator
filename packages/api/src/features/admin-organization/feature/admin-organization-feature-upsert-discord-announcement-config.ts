import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationUpsertDiscordAnnouncementConfig as adminOrganizationUpsertDiscordAnnouncementConfigDataAccess } from '../data-access/admin-organization-upsert-discord-announcement-config'
import { adminOrganizationUpsertDiscordAnnouncementConfigInputSchema } from '../data-access/admin-organization-upsert-discord-announcement-config-input-schema'

export const adminOrganizationFeatureUpsertDiscordAnnouncementConfig = adminProcedure
  .input(adminOrganizationUpsertDiscordAnnouncementConfigInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationUpsertDiscordAnnouncementConfigDataAccess(input)

    if (result.status === 'organization-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    if (result.status === 'discord-channel-not-found') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Discord channel not found in the connected server.',
      })
    }

    if (result.status === 'discord-channel-not-postable') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Discord channel is not postable by the bot.',
      })
    }

    if (result.status === 'discord-connection-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Discord connection not found.',
      })
    }

    return result.config
  })
