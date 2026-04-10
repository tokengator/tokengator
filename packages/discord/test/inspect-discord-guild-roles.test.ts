import { describe, expect, test } from 'bun:test'
import { PermissionFlagsBits } from 'discord.js'

import type { DiscordEnv } from '@tokengator/env/discord'

import { inspectDiscordGuildRoles } from '../src/inspect-discord-guild-roles'

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

describe('inspectDiscordGuildRoles', () => {
  test('returns the live guild role catalog with highest-role and assignability details', async () => {
    const result = await inspectDiscordGuildRoles(
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
                  id: 'high-role-id',
                  managed: false,
                  name: 'Whales',
                  permissions: '0',
                  position: 12,
                },
                {
                  id: 'bot-role-id',
                  managed: false,
                  name: 'TokenGator',
                  permissions: PermissionFlagsBits.ManageRoles.toString(),
                  position: 10,
                },
                {
                  id: 'member-role-id',
                  managed: false,
                  name: 'Collectors',
                  permissions: '0',
                  position: 8,
                },
                {
                  id: '123456789012345678',
                  managed: false,
                  name: '@everyone',
                  permissions: '0',
                  position: 0,
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
        botHighestRole: {
          id: 'bot-role-id',
          name: 'TokenGator',
          position: 10,
        },
        checks: [],
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
    expect(result.roles).toEqual([
      {
        assignable: false,
        checks: ['discord_role_hierarchy_blocked'],
        id: 'high-role-id',
        isDefault: false,
        managed: false,
        name: 'Whales',
        position: 12,
      },
      {
        assignable: false,
        checks: ['discord_role_hierarchy_blocked'],
        id: 'bot-role-id',
        isDefault: false,
        managed: false,
        name: 'TokenGator',
        position: 10,
      },
      {
        assignable: true,
        checks: [],
        id: 'member-role-id',
        isDefault: false,
        managed: false,
        name: 'Collectors',
        position: 8,
      },
      {
        assignable: false,
        checks: ['discord_role_is_default'],
        id: '123456789012345678',
        isDefault: true,
        managed: false,
        name: '@everyone',
        position: 0,
      },
    ])
  })

  test('reports missing bot token without attempting Discord requests', async () => {
    const result = await inspectDiscordGuildRoles(
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
      },
      roles: [],
      status: 'needs_attention',
    })
  })

  test('reports when the bot is not a member of the guild', async () => {
    const result = await inspectDiscordGuildRoles(
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

            if (route.includes('/members/')) {
              throw {
                code: 10_007,
                status: 404,
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
        checks: ['bot_not_in_guild'],
      },
      roles: [],
      status: 'needs_attention',
    })
  })

  test('reports missing Manage Roles while still returning the live role catalog', async () => {
    const result = await inspectDiscordGuildRoles(
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
                  id: 'bot-role-id',
                  managed: false,
                  name: 'TokenGator',
                  permissions: '0',
                  position: 10,
                },
                {
                  id: 'member-role-id',
                  managed: false,
                  name: 'Collectors',
                  permissions: '0',
                  position: 8,
                },
                {
                  id: '123456789012345678',
                  managed: false,
                  name: '@everyone',
                  permissions: '0',
                  position: 0,
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
        botHighestRole: {
          id: 'bot-role-id',
          name: 'TokenGator',
          position: 10,
        },
        checks: ['manage_roles_missing'],
        permissions: {
          administrator: false,
          manageRoles: false,
        },
      },
      status: 'needs_attention',
    })
    expect(result.roles.find((role) => role.id === 'member-role-id')).toMatchObject({
      assignable: false,
      checks: [],
    })
  })

  test('marks managed and hierarchy-blocked roles and reports guild role fetch failures', async () => {
    const withCatalog = await inspectDiscordGuildRoles(
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
                  id: 'managed-role-id',
                  managed: true,
                  name: 'Integration',
                  permissions: '0',
                  position: 9,
                },
                {
                  id: 'bot-role-id',
                  managed: false,
                  name: 'TokenGator',
                  permissions: PermissionFlagsBits.ManageRoles.toString(),
                  position: 7,
                },
                {
                  id: 'higher-role-id',
                  managed: false,
                  name: 'Moderators',
                  permissions: '0',
                  position: 8,
                },
                {
                  id: '123456789012345678',
                  managed: false,
                  name: '@everyone',
                  permissions: '0',
                  position: 0,
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

    expect(withCatalog.roles.find((role) => role.id === 'managed-role-id')).toMatchObject({
      assignable: false,
      checks: ['discord_role_hierarchy_blocked', 'discord_role_managed'],
    })
    expect(withCatalog.roles.find((role) => role.id === 'higher-role-id')).toMatchObject({
      assignable: false,
      checks: ['discord_role_hierarchy_blocked'],
    })

    const failedFetch = await inspectDiscordGuildRoles(
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

            if (route.includes('/members/')) {
              return {
                roles: ['bot-role-id'],
              }
            }

            if (route.endsWith('/roles')) {
              throw new Error('Roles request failed.')
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

    expect(failedFetch).toMatchObject({
      diagnostics: {
        checks: ['guild_roles_fetch_failed'],
      },
      roles: [],
      status: 'needs_attention',
    })
  })
})
