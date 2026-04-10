import { describe, expect, test } from 'bun:test'
import { PermissionFlagsBits } from 'discord.js'

import type { DiscordEnv } from '@tokengator/env/discord'

import { inspectDiscordGuildConnection } from '../src/inspect-discord-guild-connection'

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

describe('inspectDiscordGuildConnection', () => {
  test('returns connected when guild access, permissions, and command registration pass', async () => {
    const routes: string[] = []
    const result = await inspectDiscordGuildConnection(
      {
        env: baseEnv,
      },
      {
        guildId: '123456789012345678',
        registerCommands: async () => {},
        rest: {
          async get(route) {
            routes.push(route)

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
                  permissions: PermissionFlagsBits.ManageRoles.toString(),
                },
              ]
            }

            if (route.includes('/members/')) {
              return {
                roles: ['bot-role-id'],
              }
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

    expect(routes).toHaveLength(4)
    expect(result).toMatchObject({
      diagnostics: {
        checks: [],
        commands: {
          errorMessage: null,
          registered: true,
        },
        guild: {
          id: '123456789012345678',
          name: 'Acme Guild',
        },
        permissions: {
          administrator: false,
          manageRoles: true,
        },
      },
      guildName: 'Acme Guild',
      status: 'connected',
    })
  })

  test('reports missing bot token without attempting Discord requests', async () => {
    const result = await inspectDiscordGuildConnection(
      {
        env: {
          ...baseEnv,
          DISCORD_BOT_TOKEN: undefined,
        },
      },
      {
        guildId: '123456789012345678',
      },
    )

    expect(result).toMatchObject({
      diagnostics: {
        checks: ['bot_token_missing'],
        commands: {
          errorMessage: null,
          registered: false,
        },
      },
      guildName: null,
      status: 'needs_attention',
    })
  })

  test('reports missing Manage Roles and command registration failures', async () => {
    const result = await inspectDiscordGuildConnection(
      {
        env: baseEnv,
      },
      {
        guildId: '123456789012345678',
        registerCommands: async () => {
          throw new Error('Register failed.')
        },
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
                  permissions: '0',
                },
              ]
            }

            if (route.includes('/members/')) {
              return {
                roles: ['bot-role-id'],
              }
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
        checks: ['commands_registration_failed', 'manage_roles_missing'],
        commands: {
          errorMessage: 'Register failed.',
          registered: false,
        },
        permissions: {
          administrator: false,
          manageRoles: false,
        },
      },
      status: 'needs_attention',
    })
  })

  test('reports guild lookup failures as guild_not_found', async () => {
    const result = await inspectDiscordGuildConnection(
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

            throw {
              code: 10_004,
              status: 404,
            }
          },
        },
      },
    )

    expect(result).toMatchObject({
      diagnostics: {
        checks: ['guild_not_found'],
      },
      status: 'needs_attention',
    })
  })
})
