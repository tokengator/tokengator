import z from 'zod'

import { adminOrganizationRefreshDiscordConnectionInputSchema } from './admin-organization-refresh-discord-connection-input-schema'

export type AdminOrganizationRefreshDiscordConnectionInput = z.infer<
  typeof adminOrganizationRefreshDiscordConnectionInputSchema
>
