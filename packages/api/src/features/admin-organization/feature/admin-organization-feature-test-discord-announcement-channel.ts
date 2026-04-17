import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationTestDiscordAnnouncementChannel as adminOrganizationTestDiscordAnnouncementChannelDataAccess } from '../data-access/admin-organization-test-discord-announcement-channel'
import { adminOrganizationTestDiscordAnnouncementChannelInputSchema } from '../data-access/admin-organization-test-discord-announcement-channel-input-schema'

export const adminOrganizationFeatureTestDiscordAnnouncementChannel = adminProcedure
  .input(adminOrganizationTestDiscordAnnouncementChannelInputSchema)
  .handler(async ({ context, input }) => {
    const result = await adminOrganizationTestDiscordAnnouncementChannelDataAccess({
      ...input,
      requestedByName: context.session.user.name,
      requestedByUserId: context.session.user.id,
    })

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

    if (result.status === 'discord-message-send-rate-limited') {
      throw new ORPCError('TOO_MANY_REQUESTS', {
        message: 'Discord rate limited the test message. Please try again shortly.',
      })
    }

    if (result.status === 'discord-message-send-failed') {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to send Discord test message.',
      })
    }

    return {
      channelId: result.channelId,
      channelName: result.channelName,
    }
  })
