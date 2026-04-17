import { describe, expect, test } from 'bun:test'
import { ChannelType, PermissionFlagsBits } from 'discord.js'

import type { DiscordEnv } from '@tokengator/env/discord'

import { inspectDiscordGuildAnnouncementChannels } from '../src/inspect-discord-guild-announcement-channels'

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

describe('inspectDiscordGuildAnnouncementChannels', () => {
  test('lists text-like channels and marks a channel non-postable when overwrites deny send access', async () => {
    const result = await inspectDiscordGuildAnnouncementChannels(
      {
        env: baseEnv,
      },
      {
        guildId: '123456789012345678',
        rest: {
          async get(route) {
            if (route.includes('/users/')) {
              return {
                id: 'bot-user-id',
              }
            }

            if (route.endsWith('/roles')) {
              return [
                {
                  id: '123456789012345678',
                  permissions: '0',
                },
                {
                  id: 'bot-role-id',
                  permissions: (
                    PermissionFlagsBits.EmbedLinks |
                    PermissionFlagsBits.SendMessages |
                    PermissionFlagsBits.ViewChannel
                  ).toString(),
                },
              ]
            }

            if (route.includes('/members/')) {
              return {
                roles: ['bot-role-id'],
              }
            }

            if (route.includes('/channels')) {
              return [
                {
                  id: 'channel-voice',
                  name: 'voice',
                  type: ChannelType.GuildVoice,
                },
                {
                  id: 'channel-general',
                  name: 'general',
                  type: ChannelType.GuildText,
                },
                {
                  id: 'channel-news',
                  name: 'news',
                  type: ChannelType.GuildAnnouncement,
                },
                {
                  id: 'channel-staff',
                  name: 'staff',
                  permission_overwrites: [
                    {
                      allow: '0',
                      deny: PermissionFlagsBits.SendMessages.toString(),
                      id: 'bot-role-id',
                      type: 0,
                    },
                  ],
                  type: ChannelType.GuildText,
                },
              ]
            }

            if (route.includes('/guilds/123456789012345678')) {
              return {
                id: '123456789012345678',
                name: 'Acme Guild',
              }
            }

            throw new Error(`Unexpected route: ${route}`)
          },
        },
      },
    )

    expect(result).toMatchObject({
      diagnostics: {
        checks: [],
        guild: {
          id: '123456789012345678',
          name: 'Acme Guild',
        },
        permissions: {
          administrator: false,
        },
      },
      guildName: 'Acme Guild',
      status: 'connected',
    })
    expect(result.channels).toEqual([
      {
        canPost: true,
        checks: [],
        id: 'channel-general',
        name: 'general',
        type: 'text',
      },
      {
        canPost: true,
        checks: [],
        id: 'channel-news',
        name: 'news',
        type: 'announcement',
      },
      {
        canPost: false,
        checks: ['send_messages_missing'],
        id: 'channel-staff',
        name: 'staff',
        type: 'text',
      },
    ])
  })

  test('returns needs_attention when no announcement channel is postable', async () => {
    const result = await inspectDiscordGuildAnnouncementChannels(
      {
        env: baseEnv,
      },
      {
        guildId: '123456789012345678',
        rest: {
          async get(route) {
            if (route.includes('/users/')) {
              return {
                id: 'bot-user-id',
              }
            }

            if (route.endsWith('/roles')) {
              return [
                {
                  id: '123456789012345678',
                  permissions: '0',
                },
                {
                  id: 'bot-role-id',
                  permissions: (
                    PermissionFlagsBits.EmbedLinks |
                    PermissionFlagsBits.SendMessages |
                    PermissionFlagsBits.ViewChannel
                  ).toString(),
                },
              ]
            }

            if (route.includes('/members/')) {
              return {
                roles: ['bot-role-id'],
              }
            }

            if (route.includes('/channels')) {
              return [
                {
                  id: 'channel-staff',
                  name: 'staff',
                  permission_overwrites: [
                    {
                      allow: '0',
                      deny: PermissionFlagsBits.SendMessages.toString(),
                      id: 'bot-role-id',
                      type: 0,
                    },
                  ],
                  type: ChannelType.GuildText,
                },
              ]
            }

            if (route.includes('/guilds/123456789012345678')) {
              return {
                id: '123456789012345678',
                name: 'Acme Guild',
              }
            }

            throw new Error(`Unexpected route: ${route}`)
          },
        },
      },
    )

    expect(result).toMatchObject({
      status: 'needs_attention',
    })
    expect(result.channels).toEqual([
      {
        canPost: false,
        checks: ['send_messages_missing'],
        id: 'channel-staff',
        name: 'staff',
        type: 'text',
      },
    ])
  })

  test('marks a channel non-postable when embed links are missing', async () => {
    const result = await inspectDiscordGuildAnnouncementChannels(
      {
        env: baseEnv,
      },
      {
        guildId: '123456789012345678',
        rest: {
          async get(route) {
            if (route.includes('/users/')) {
              return {
                id: 'bot-user-id',
              }
            }

            if (route.endsWith('/roles')) {
              return [
                {
                  id: '123456789012345678',
                  permissions: '0',
                },
                {
                  id: 'bot-role-id',
                  permissions: (PermissionFlagsBits.SendMessages | PermissionFlagsBits.ViewChannel).toString(),
                },
              ]
            }

            if (route.includes('/members/')) {
              return {
                roles: ['bot-role-id'],
              }
            }

            if (route.includes('/channels')) {
              return [
                {
                  id: 'channel-general',
                  name: 'general',
                  type: ChannelType.GuildText,
                },
              ]
            }

            if (route.includes('/guilds/123456789012345678')) {
              return {
                id: '123456789012345678',
                name: 'Acme Guild',
              }
            }

            throw new Error(`Unexpected route: ${route}`)
          },
        },
      },
    )

    expect(result).toMatchObject({
      status: 'needs_attention',
    })
    expect(result.channels).toEqual([
      {
        canPost: false,
        checks: ['embed_links_missing'],
        id: 'channel-general',
        name: 'general',
        type: 'text',
      },
    ])
  })
})
