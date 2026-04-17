import z from 'zod'

import { adminOrganizationGetDiscordAnnouncementCatalogInputSchema } from './admin-organization-get-discord-announcement-catalog-input-schema'

export type AdminOrganizationGetDiscordAnnouncementCatalogInput = z.infer<
  typeof adminOrganizationGetDiscordAnnouncementCatalogInputSchema
>
