import { describe, expect, test } from 'bun:test'
import { PermissionFlagsBits } from 'discord.js'

import type { DiscordEnv } from '@tokengator/env/discord'

import { createDiscordBotInviteUrl } from '../src/create-discord-bot-invite-url'
import { shouldStartDiscord } from '../src/discord-env'

const baseEnv = {
  BETTER_AUTH_URL: 'https://auth.example.com',
  DISCORD_BOT_START: true,
  DISCORD_BOT_TOKEN: 'bot-token',
  DISCORD_CLIENT_ID: 'client-id',
  DISCORD_GUILD_ID: 'guild-id',
  LOG_DEBUG_CATEGORIES: [],
  LOG_JSON: false,
  NODE_ENV: 'development',
  WEB_URL: 'https://app.example.com',
} satisfies DiscordEnv

describe('Discord env helpers', () => {
  test('createDiscordBotInviteUrl uses injected env values by default', () => {
    expect(createDiscordBotInviteUrl({ env: baseEnv })).toBe(
      `https://discord.com/oauth2/authorize?client_id=client-id&disable_guild_select=true&guild_id=guild-id&permissions=${PermissionFlagsBits.ManageRoles.toString()}&scope=applications.commands+bot`,
    )
  })

  test('createDiscordBotInviteUrl keeps explicit overrides ahead of injected env values', () => {
    expect(
      createDiscordBotInviteUrl(
        { env: baseEnv },
        {
          clientId: 'override-client-id',
          guildId: 'override-guild-id',
        },
      ),
    ).toBe(
      `https://discord.com/oauth2/authorize?client_id=override-client-id&disable_guild_select=true&guild_id=override-guild-id&permissions=${PermissionFlagsBits.ManageRoles.toString()}&scope=applications.commands+bot`,
    )
  })

  test('shouldStartDiscord returns false in test even when bot start is enabled', () => {
    expect(
      shouldStartDiscord({
        env: {
          ...baseEnv,
          NODE_ENV: 'test',
        },
      }),
    ).toBe(false)
  })

  test('shouldStartDiscord returns false when bot start is disabled', () => {
    expect(
      shouldStartDiscord({
        env: {
          ...baseEnv,
          DISCORD_BOT_START: false,
        },
      }),
    ).toBe(false)
  })
})
