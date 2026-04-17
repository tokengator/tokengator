import z from 'zod'

import { adminOrganizationUpsertDiscordAnnouncementConfigInputSchema } from './admin-organization-upsert-discord-announcement-config-input-schema'

export type AdminOrganizationUpsertDiscordAnnouncementConfigInput = z.infer<
  typeof adminOrganizationUpsertDiscordAnnouncementConfigInputSchema
>
