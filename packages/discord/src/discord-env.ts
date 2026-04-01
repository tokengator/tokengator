import { env } from '@tokengator/env/discord'

function getRequiredEnvValue(name: string, value: string | undefined) {
  if (value) {
    return value
  }

  throw new Error(`${name} is required for Discord integration.`)
}

export function getDiscordBotToken(token?: string) {
  return token ?? getRequiredEnvValue('DISCORD_BOT_TOKEN', env.DISCORD_BOT_TOKEN)
}

export function getDiscordClientId(clientId?: string) {
  return clientId ?? getRequiredEnvValue('DISCORD_CLIENT_ID', env.DISCORD_CLIENT_ID)
}

export function getDiscordPlatformUrl() {
  return env.WEB_URL ?? env.BETTER_AUTH_URL
}

export function getDiscordGuildId(guildId?: string) {
  return guildId ?? getRequiredEnvValue('DISCORD_GUILD_ID', env.DISCORD_GUILD_ID)
}

export function getOptionalDiscordGuildId(guildId?: string) {
  return guildId ?? env.DISCORD_GUILD_ID
}

export function shouldStartDiscord() {
  return env.NODE_ENV !== 'test' && env.DISCORD_BOT_START
}
