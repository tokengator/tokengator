import z from 'zod'

import { DISCORD_GUILD_ID_PATTERN } from '../../../features/community-discord-connection'

export const adminOrganizationUpsertDiscordConnectionInputSchema = z.object({
  guildId: z.string().trim().regex(DISCORD_GUILD_ID_PATTERN, 'Guild ID must be a numeric Discord snowflake.'),
  organizationId: z.string().min(1),
})
