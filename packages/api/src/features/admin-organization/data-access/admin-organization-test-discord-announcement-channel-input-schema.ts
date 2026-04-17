import z from 'zod'

import {
  communityDiscordAnnouncementTypes,
  DISCORD_CHANNEL_ID_PATTERN,
} from '../../../features/community-discord-announcement'

export const adminOrganizationTestDiscordAnnouncementChannelInputSchema = z.object({
  channelId: z.string().trim().regex(DISCORD_CHANNEL_ID_PATTERN, 'Channel ID must be a numeric Discord snowflake.'),
  organizationId: z.string().min(1),
  type: z.enum(communityDiscordAnnouncementTypes),
})
