import type { DiscordContext } from './discord-context'

function getRequiredEnvValue(name: string, value: string | undefined) {
  if (value) {
    return value
  }

  throw new Error(`${name} is required for Discord integration.`)
}

export function getDiscordBotToken(ctx: Pick<DiscordContext, 'env'>, token?: string) {
  return token ?? getRequiredEnvValue('DISCORD_BOT_TOKEN', ctx.env.DISCORD_BOT_TOKEN)
}

export function getDiscordClientId(ctx: Pick<DiscordContext, 'env'>, clientId?: string) {
  return clientId ?? getRequiredEnvValue('DISCORD_CLIENT_ID', ctx.env.DISCORD_CLIENT_ID)
}

export function getDiscordPlatformUrl(ctx: Pick<DiscordContext, 'env'>) {
  return ctx.env.WEB_URL ?? ctx.env.API_URL
}

export function getDiscordGuildId(ctx: Pick<DiscordContext, 'env'>, guildId?: string) {
  return guildId ?? getRequiredEnvValue('DISCORD_GUILD_ID', ctx.env.DISCORD_GUILD_ID)
}

export function getOptionalDiscordGuildId(ctx: Pick<DiscordContext, 'env'>, guildId?: string) {
  return guildId ?? ctx.env.DISCORD_GUILD_ID
}

export function shouldStartDiscord(ctx: Pick<DiscordContext, 'env'>) {
  return ctx.env.NODE_ENV !== 'test' && ctx.env.DISCORD_BOT_START
}
