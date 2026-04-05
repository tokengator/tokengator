import dotenv from 'dotenv'
import { resolve } from 'node:path'
import { configureAppLogger, getAppLogger } from '@tokengator/logger'

dotenv.config({
  path: resolve(import.meta.dir, '../.env'),
  quiet: true,
})

const { env } = await import('@tokengator/env/discord')

configureAppLogger({ env })

const logger = getAppLogger('api', 'provision-discord-roles')
const [{ devSeed }, { ensureDiscordRole, listDiscordRoles }] = await Promise.all([
  import('@tokengator/db/seed'),
  import('@tokengator/discord'),
])

const roleNames = [...new Set(devSeed.communityRoles.map((communityRole) => communityRole.name))].sort((left, right) =>
  left.localeCompare(right),
)
const results: Awaited<ReturnType<typeof ensureDiscordRole>>[] = []
const state = await listDiscordRoles(
  { env },
  {
    guildId: env.DISCORD_GUILD_ID,
  },
)

for (const roleName of roleNames) {
  results.push(
    await ensureDiscordRole(
      { env },
      {
        name: roleName,
        state,
      },
    ),
  )
}

const createdRoles = results.filter((result) => result.created).map((result) => result.roleName)
const existingRoles = results.filter((result) => !result.created).map((result) => result.roleName)
logger.info(
  'Provisioned {roleCount} dev guild role(s) for guild {guildId}: {createdCount} created, {existingCount} reused.',
  {
    createdCount: createdRoles.length,
    existingCount: existingRoles.length,
    guildId: env.DISCORD_GUILD_ID ?? 'unknown',
    roleCount: roleNames.length,
  },
)

if (createdRoles.length > 0) {
  logger.info('Created roles: {createdRoles}', {
    createdRoles: createdRoles.join(', '),
  })
}

if (existingRoles.length > 0) {
  logger.info('Reused roles: {existingRoles}', {
    existingRoles: existingRoles.join(', '),
  })
}
