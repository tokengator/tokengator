import { afterEach, describe, expect, test } from 'bun:test'

import { REST, Routes } from 'discord.js'
import type { DiscordEnv } from '@tokengator/env/discord'

import { ensureDiscordRole, listDiscordRoles } from '../src/ensure-discord-role'

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

const originalGet = REST.prototype.get
const originalPost = REST.prototype.post
const originalSetToken = REST.prototype.setToken

afterEach(() => {
  REST.prototype.get = originalGet
  REST.prototype.post = originalPost
  REST.prototype.setToken = originalSetToken
})

describe('ensureDiscordRole', () => {
  test('uses env-provided guild and token defaults when creating a missing role', async () => {
    let capturedRoute = ''
    let capturedToken = ''
    let capturedBody: unknown

    REST.prototype.get = async function get(fullRoute: string) {
      capturedRoute = fullRoute

      return []
    }
    REST.prototype.post = async function post(fullRoute: string, options: { body?: unknown } = {}) {
      capturedRoute = fullRoute
      capturedBody = options.body

      return {
        id: 'role-1',
        name: 'Perk shark',
      }
    }
    REST.prototype.setToken = function setToken(token: string) {
      capturedToken = token

      return this
    }

    await expect(
      ensureDiscordRole(
        { env: baseEnv },
        {
          name: 'Perk shark',
        },
      ),
    ).resolves.toEqual({
      created: true,
      roleId: 'role-1',
      roleName: 'Perk shark',
    })

    expect(capturedRoute).toBe(Routes.guildRoles(baseEnv.DISCORD_GUILD_ID))
    expect(capturedToken).toBe(baseEnv.DISCORD_BOT_TOKEN)
    expect(capturedBody).toEqual({
      name: 'Perk shark',
    })
  })

  test('returns an existing role when an exact name match already exists', async () => {
    let postCallCount = 0

    REST.prototype.get = async function get() {
      return [
        {
          id: 'role-1',
          name: 'Perk shark',
        },
        {
          id: 'role-2',
          name: 'Store whale',
        },
      ]
    }
    REST.prototype.post = async function post() {
      postCallCount += 1

      return {
        id: 'role-3',
        name: 'Perk shark',
      }
    }

    await expect(
      ensureDiscordRole(
        { env: baseEnv },
        {
          name: 'Perk shark',
        },
      ),
    ).resolves.toEqual({
      created: false,
      roleId: 'role-1',
      roleName: 'Perk shark',
    })

    expect(postCallCount).toBe(0)
  })

  test('creates the role when the guild does not already have it', async () => {
    let postCallCount = 0

    REST.prototype.get = async function get() {
      return [
        {
          id: 'role-1',
          name: 'Perk shark',
        },
      ]
    }
    REST.prototype.post = async function post() {
      postCallCount += 1

      return {
        id: 'role-2',
        name: 'Store whale',
      }
    }

    await expect(
      ensureDiscordRole(
        { env: baseEnv },
        {
          name: 'Store whale',
        },
      ),
    ).resolves.toEqual({
      created: true,
      roleId: 'role-2',
      roleName: 'Store whale',
    })

    expect(postCallCount).toBe(1)
  })

  test('reuses a caller-provided rest client and role list for bulk provisioning', async () => {
    let getCallCount = 0
    let postCallCount = 0
    const rest = {
      get: async () => {
        getCallCount += 1

        return [
          {
            id: 'role-1',
            name: 'Perk shark',
          },
        ]
      },
      post: async (_route: string, options: { body?: unknown } = {}) => {
        postCallCount += 1

        const name =
          typeof options.body === 'object' && options.body !== null && 'name' in options.body ? options.body.name : null

        return {
          id: `role-${postCallCount + 1}`,
          name: typeof name === 'string' ? name : 'unknown',
        }
      },
    }
    const state = await listDiscordRoles(
      { env: baseEnv },
      {
        rest,
      },
    )

    expect(state.guildId).toBe(baseEnv.DISCORD_GUILD_ID)
    expect(state.rolesByName.get('Perk shark')?.id).toBe('role-1')
    expect(state.rolesByName.get('Perk shark')?.name).toBe('Perk shark')

    await expect(
      ensureDiscordRole(
        { env: baseEnv },
        {
          name: 'Store whale',
          state,
        },
      ),
    ).resolves.toEqual({
      created: true,
      roleId: 'role-2',
      roleName: 'Store whale',
    })
    expect(state.rolesByName.get('Store whale')?.id).toBe('role-2')
    expect(state.rolesByName.get('Store whale')?.name).toBe('Store whale')

    await expect(
      ensureDiscordRole(
        { env: baseEnv },
        {
          name: 'Store whale',
          state,
        },
      ),
    ).resolves.toEqual({
      created: false,
      roleId: 'role-2',
      roleName: 'Store whale',
    })

    expect(getCallCount).toBe(1)
    expect(postCallCount).toBe(1)
  })

  test('keeps first-match role selection consistent between cached and fallback lookups', async () => {
    const duplicateRoles = [
      {
        id: 'role-1',
        name: 'Perk shark',
      },
      {
        id: 'role-2',
        name: 'Perk shark',
      },
    ]
    const rest = {
      get: async () => duplicateRoles,
      post: async () => {
        throw new Error('post should not be called for an existing role')
      },
    }
    REST.prototype.get = async function get() {
      return duplicateRoles
    }
    REST.prototype.post = async function post() {
      throw new Error('post should not be called for an existing role')
    }
    const state = await listDiscordRoles(
      { env: baseEnv },
      {
        rest,
      },
    )

    expect(state.rolesByName.get('Perk shark')?.id).toBe('role-1')

    await expect(
      ensureDiscordRole(
        { env: baseEnv },
        {
          name: 'Perk shark',
        },
      ),
    ).resolves.toEqual({
      created: false,
      roleId: 'role-1',
      roleName: 'Perk shark',
    })

    await expect(
      ensureDiscordRole(
        { env: baseEnv },
        {
          name: 'Perk shark',
          state,
        },
      ),
    ).resolves.toEqual({
      created: false,
      roleId: 'role-1',
      roleName: 'Perk shark',
    })
  })

  test('rejects a provisioning state from a different guild', async () => {
    let getCallCount = 0
    let postCallCount = 0
    const state = {
      guildId: 'other-guild',
      rest: {
        get: async () => {
          getCallCount += 1

          return []
        },
        post: async () => {
          postCallCount += 1

          return {
            id: 'role-1',
            name: 'Perk shark',
          }
        },
      },
      rolesByName: new Map(),
    }

    await expect(
      ensureDiscordRole(
        { env: baseEnv },
        {
          name: 'Perk shark',
          state,
        },
      ),
    ).rejects.toThrow(
      `Discord role provisioning state guild mismatch: expected ${baseEnv.DISCORD_GUILD_ID}, received other-guild`,
    )

    expect(getCallCount).toBe(0)
    expect(postCallCount).toBe(0)
  })

  test('surfaces Discord REST failures without swallowing them', async () => {
    const expectedError = new Error('discord exploded')

    REST.prototype.get = async function get() {
      return []
    }
    REST.prototype.post = async function post() {
      throw expectedError
    }

    await expect(
      ensureDiscordRole(
        { env: baseEnv },
        {
          name: 'Perk shark',
        },
      ),
    ).rejects.toBe(expectedError)
  })
})
