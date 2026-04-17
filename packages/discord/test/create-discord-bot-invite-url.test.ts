import { describe, expect, test } from 'bun:test'
import { PermissionFlagsBits } from 'discord.js'

import type { DiscordEnv } from '@tokengator/env/discord'

import { createDiscordBotInviteUrl } from '../src/create-discord-bot-invite-url'

const baseEnv = {
  API_URL: 'https://api.example.com',
  DISCORD_BOT_START: true,
  DISCORD_BOT_TOKEN: 'bot-token',
  DISCORD_CLIENT_ID: 'client-id',
  DISCORD_GUILD_ID: 'guild-id',
  LOG_DEBUG_CATEGORIES: [],
  LOG_JSON: false,
  NODE_ENV: 'development',
  WEB_URL: 'https://app.example.com',
} satisfies DiscordEnv

describe('createDiscordBotInviteUrl', () => {
  test('requests role and message permissions for the target guild', () => {
    const expectedPermissions = (
      PermissionFlagsBits.EmbedLinks |
      PermissionFlagsBits.ManageRoles |
      PermissionFlagsBits.SendMessages |
      PermissionFlagsBits.ViewChannel
    ).toString()

    expect(
      createDiscordBotInviteUrl(
        {
          env: baseEnv,
        },
        {
          guildId: '123456789012345678',
        },
      ),
    ).toBe(
      `https://discord.com/oauth2/authorize?client_id=client-id&disable_guild_select=true&guild_id=123456789012345678&permissions=${expectedPermissions}&scope=applications.commands+bot`,
    )
  })
})
