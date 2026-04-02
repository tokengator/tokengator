import dotenv from 'dotenv'
import { resolve } from 'node:path'

dotenv.config({
  path: resolve(import.meta.dir, '../.env'),
  quiet: true,
})

const [{ devSeed }, { ensureDiscordRole, listDiscordRoles }, { env: discordEnv }] = await Promise.all([
  import('@tokengator/db/seed'),
  import('@tokengator/discord'),
  import('@tokengator/env/discord'),
])

const roleNames = [...new Set(devSeed.communityRoles.map((communityRole) => communityRole.name))].sort((left, right) =>
  left.localeCompare(right),
)
const results: Awaited<ReturnType<typeof ensureDiscordRole>>[] = []
const state = await listDiscordRoles(
  { env: discordEnv },
  {
    guildId: discordEnv.DISCORD_GUILD_ID,
  },
)

for (const roleName of roleNames) {
  results.push(
    await ensureDiscordRole(
      { env: discordEnv },
      {
        name: roleName,
        state,
      },
    ),
  )
}

const createdRoles = results.filter((result) => result.created).map((result) => result.roleName)
const existingRoles = results.filter((result) => !result.created).map((result) => result.roleName)
const guildId = discordEnv.DISCORD_GUILD_ID ?? 'unknown'

console.info(
  `[discord] Provisioned ${roleNames.length} dev guild role(s) for guild ${guildId}: ${createdRoles.length} created, ${existingRoles.length} reused.`,
)

if (createdRoles.length > 0) {
  console.info(`[discord] Created roles: ${createdRoles.join(', ')}`)
}

if (existingRoles.length > 0) {
  console.info(`[discord] Reused roles: ${existingRoles.join(', ')}`)
}
