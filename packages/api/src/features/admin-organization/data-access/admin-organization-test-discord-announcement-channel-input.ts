import z from 'zod'

import { adminOrganizationTestDiscordAnnouncementChannelInputSchema } from './admin-organization-test-discord-announcement-channel-input-schema'

export type AdminOrganizationTestDiscordAnnouncementChannelInput = z.infer<
  typeof adminOrganizationTestDiscordAnnouncementChannelInputSchema
>
