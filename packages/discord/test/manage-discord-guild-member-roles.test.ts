import { describe, expect, test } from 'bun:test'
import { REST, Routes } from 'discord.js'
import type { DiscordEnv } from '@tokengator/env/discord'

import {
  addDiscordGuildMemberRole,
  getDiscordGuildMember,
  listDiscordGuildMembers,
  removeDiscordGuildMemberRole,
} from '../src/manage-discord-guild-member-roles'

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

describe('manageDiscordGuildMemberRoles', () => {
  test('reuses the default REST client across guild member lookups for the same token', async () => {
    const originalGet = REST.prototype.get
    const originalSetToken = REST.prototype.setToken
    let setTokenCalls = 0

    REST.prototype.get = async function get(route: string) {
      if (route === Routes.guildMember('guild-id', 'user-a')) {
        return {
          roles: ['role-a'],
          user: {
            id: 'user-a',
          },
        }
      }

      if (route === Routes.guildMember('guild-id', 'user-b')) {
        return {
          roles: ['role-b'],
          user: {
            id: 'user-b',
          },
        }
      }

      throw new Error(`Unexpected route: ${route}`)
    }
    REST.prototype.setToken = function setToken(token: string) {
      setTokenCalls += 1

      return originalSetToken.call(this, token)
    }

    try {
      await expect(
        getDiscordGuildMember(
          {
            env: baseEnv,
          },
          {
            guildId: 'guild-id',
            userId: 'user-a',
          },
        ),
      ).resolves.toEqual({
        discordUserId: 'user-a',
        roleIds: ['role-a'],
      })

      await expect(
        getDiscordGuildMember(
          {
            env: baseEnv,
          },
          {
            guildId: 'guild-id',
            userId: 'user-b',
          },
        ),
      ).resolves.toEqual({
        discordUserId: 'user-b',
        roleIds: ['role-b'],
      })
    } finally {
      REST.prototype.get = originalGet
      REST.prototype.setToken = originalSetToken
    }

    expect(setTokenCalls).toBe(1)
  })

  test('gets a guild member and normalizes lookup failures', async () => {
    await expect(
      getDiscordGuildMember(
        {
          env: baseEnv,
        },
        {
          guildId: 'guild-id',
          rest: {
            get: async (route) => {
              expect(route).toBe(Routes.guildMember('guild-id', 'user-id'))

              return {
                roles: ['role-b', 'role-a'],
                user: {
                  id: 'user-id',
                },
              }
            },
          },
          userId: 'user-id',
        },
      ),
    ).resolves.toEqual({
      discordUserId: 'user-id',
      roleIds: ['role-a', 'role-b'],
    })

    await expect(
      getDiscordGuildMember(
        {
          env: baseEnv,
        },
        {
          guildId: 'guild-id',
          rest: {
            get: async () => {
              throw {
                code: 10_007,
                message: 'Unknown Member',
                status: 404,
              }
            },
          },
          userId: 'missing-user',
        },
      ),
    ).resolves.toBeNull()

    await expect(
      getDiscordGuildMember(
        {
          env: baseEnv,
        },
        {
          guildId: 'guild-id',
          rest: {
            get: async () => {
              throw {
                code: 50_001,
                message: 'Missing Access',
                status: 403,
              }
            },
          },
          userId: 'user-id',
        },
      ),
    ).rejects.toMatchObject({
      code: 'forbidden',
      discordCode: 50_001,
      status: 403,
    })
  })

  test('lists guild members across paginated Discord responses', async () => {
    const seenRoutes: string[] = []
    const firstPageMembers = Array.from({ length: 1000 }, (_, index) => ({
      roles: index === 0 ? ['role-b', 'role-a'] : [],
      user: {
        id: `${200 + index}`,
      },
    }))

    const members = await listDiscordGuildMembers(
      {
        env: baseEnv,
      },
      {
        guildId: '123456789012345678',
        rest: {
          get: async (route) => {
            seenRoutes.push(route)

            if (route === `${Routes.guildMembers('123456789012345678')}?limit=1000`) {
              return firstPageMembers
            }

            if (route === `${Routes.guildMembers('123456789012345678')}?limit=1000&after=1199`) {
              return [
                {
                  roles: ['role-d'],
                  user: {
                    id: '1200',
                  },
                },
              ]
            }

            throw new Error(`Unexpected route: ${route}`)
          },
        },
      },
    )

    expect(seenRoutes).toEqual([
      `${Routes.guildMembers('123456789012345678')}?limit=1000`,
      `${Routes.guildMembers('123456789012345678')}?limit=1000&after=1199`,
    ])
    expect(members.find((member) => member.discordUserId === '200')).toEqual({
      discordUserId: '200',
      roleIds: ['role-a', 'role-b'],
    })
    expect(members.find((member) => member.discordUserId === '1200')).toEqual({
      discordUserId: '1200',
      roleIds: ['role-d'],
    })
    expect(members).toHaveLength(1001)
    expect(members.filter((member) => member.discordUserId >= '201' && member.discordUserId <= '203')).toEqual([
      {
        discordUserId: '201',
        roleIds: [],
      },
      {
        discordUserId: '202',
        roleIds: [],
      },
      {
        discordUserId: '203',
        roleIds: [],
      },
    ])
  })

  test('adds and removes guild member roles using the Discord member-role routes', async () => {
    const deletedRoutes: string[] = []
    const putCalls: Array<{ options?: { reason?: string }; route: string }> = []

    const rest = {
      delete: async (route: string) => {
        deletedRoutes.push(route)

        return null
      },
      get: async () => [],
      put: async (route: string, options?: { reason?: string }) => {
        putCalls.push({
          options,
          route,
        })

        return null
      },
    }

    await addDiscordGuildMemberRole(
      {
        env: baseEnv,
      },
      {
        guildId: 'guild-id',
        reason: 'manual reconcile',
        rest,
        roleId: 'role-id',
        userId: 'user-id',
      },
    )
    await removeDiscordGuildMemberRole(
      {
        env: baseEnv,
      },
      {
        guildId: 'guild-id',
        rest,
        roleId: 'role-id',
        userId: 'user-id',
      },
    )

    expect(putCalls).toEqual([
      {
        options: {
          reason: 'manual reconcile',
        },
        route: Routes.guildMemberRole('guild-id', 'user-id', 'role-id'),
      },
    ])
    expect(deletedRoutes).toEqual([Routes.guildMemberRole('guild-id', 'user-id', 'role-id')])
  })

  test('normalizes guild member, role, permission, and rate-limit failures', async () => {
    await expect(
      addDiscordGuildMemberRole(
        {
          env: baseEnv,
        },
        {
          guildId: 'guild-id',
          rest: {
            delete: async () => null,
            get: async () => [],
            put: async () => {
              throw {
                code: 10_007,
                message: 'Unknown Member',
                status: 404,
              }
            },
          },
          roleId: 'role-id',
          userId: 'user-id',
        },
      ),
    ).rejects.toMatchObject({
      code: 'guild_member_not_found',
      discordCode: 10_007,
      status: 404,
    })

    await expect(
      addDiscordGuildMemberRole(
        {
          env: baseEnv,
        },
        {
          guildId: 'guild-id',
          rest: {
            delete: async () => null,
            get: async () => [],
            put: async () => {
              throw {
                code: 10_011,
                message: 'Unknown Role',
                status: 404,
              }
            },
          },
          roleId: 'role-id',
          userId: 'user-id',
        },
      ),
    ).rejects.toMatchObject({
      code: 'role_not_found',
      discordCode: 10_011,
      status: 404,
    })

    await expect(
      removeDiscordGuildMemberRole(
        {
          env: baseEnv,
        },
        {
          guildId: 'guild-id',
          rest: {
            delete: async () => {
              throw {
                message: 'Missing Permissions',
                status: 403,
              }
            },
            get: async () => [],
            put: async () => null,
          },
          roleId: 'role-id',
          userId: 'user-id',
        },
      ),
    ).rejects.toMatchObject({
      code: 'forbidden',
      status: 403,
    })

    await expect(
      removeDiscordGuildMemberRole(
        {
          env: baseEnv,
        },
        {
          guildId: 'guild-id',
          rest: {
            delete: async () => {
              throw {
                message: 'You are being rate limited.',
                status: 429,
              }
            },
            get: async () => [],
            put: async () => null,
          },
          roleId: 'role-id',
          userId: 'user-id',
        },
      ),
    ).rejects.toMatchObject({
      code: 'rate_limited',
      status: 429,
    })
  })
})
