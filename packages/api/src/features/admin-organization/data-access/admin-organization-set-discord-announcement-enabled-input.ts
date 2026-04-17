import z from 'zod'

import { adminOrganizationSetDiscordAnnouncementEnabledInputSchema } from './admin-organization-set-discord-announcement-enabled-input-schema'

export type AdminOrganizationSetDiscordAnnouncementEnabledInput = z.infer<
  typeof adminOrganizationSetDiscordAnnouncementEnabledInputSchema
>
