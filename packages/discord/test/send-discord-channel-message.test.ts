import { describe, expect, test } from 'bun:test'

import type { DiscordEnv } from '@tokengator/env/discord'

import { DiscordChannelMessageError, sendDiscordChannelMessage } from '../src/send-discord-channel-message'

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

describe('sendDiscordChannelMessage', () => {
  test('posts a plain-text message to the Discord channel route', async () => {
    let capturedBody: unknown
    let capturedRoute = ''

    await sendDiscordChannelMessage(
      {
        env: baseEnv,
      },
      {
        channelId: 'channel-1',
        content: 'hello world',
        rest: {
          async post(route, options = {}) {
            capturedBody = options.body
            capturedRoute = route

            return {}
          },
        },
      },
    )

    expect(capturedRoute).toBe('/channels/channel-1/messages')
    expect(capturedBody).toEqual({
      content: 'hello world',
    })
  })

  test('posts a structured Discord message body when provided', async () => {
    let capturedBody: unknown

    await sendDiscordChannelMessage(
      {
        env: baseEnv,
      },
      {
        body: {
          allowed_mentions: {
            parse: [],
            users: ['user-1'],
          },
          content: '<@user-1>',
          embeds: [
            {
              color: 0x5865f2,
              description: '**Triggered by:** <@user-1>',
              title: 'Test',
            },
          ],
        },
        channelId: 'channel-1',
        rest: {
          async post(_route, options = {}) {
            capturedBody = options.body

            return {}
          },
        },
      },
    )

    expect(capturedBody).toEqual({
      allowed_mentions: {
        parse: [],
        users: ['user-1'],
      },
      content: '<@user-1>',
      embeds: [
        {
          color: 0x5865f2,
          description: '**Triggered by:** <@user-1>',
          title: 'Test',
        },
      ],
    })
  })

  test('maps Discord API failures into typed message-send errors', async () => {
    await expect(
      sendDiscordChannelMessage(
        {
          env: baseEnv,
        },
        {
          channelId: 'channel-1',
          content: 'hello world',
          rest: {
            async post() {
              throw {
                code: 10_003,
                message: 'Unknown Channel',
                status: 404,
              }
            },
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'channel_not_found',
    } satisfies Pick<DiscordChannelMessageError, 'code'>)

    await expect(
      sendDiscordChannelMessage(
        {
          env: baseEnv,
        },
        {
          channelId: 'channel-1',
          content: 'hello world',
          rest: {
            async post() {
              throw {
                message: 'Forbidden',
                status: 403,
              }
            },
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'forbidden',
    } satisfies Pick<DiscordChannelMessageError, 'code'>)

    await expect(
      sendDiscordChannelMessage(
        {
          env: baseEnv,
        },
        {
          channelId: 'channel-1',
          content: 'hello world',
          rest: {
            async post() {
              throw {
                message: 'Too Many Requests',
                status: 429,
              }
            },
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'rate_limited',
    } satisfies Pick<DiscordChannelMessageError, 'code'>)

    await expect(
      sendDiscordChannelMessage(
        {
          env: baseEnv,
        },
        {
          channelId: 'channel-1',
          content: 'hello world',
          rest: {
            async post() {
              throw {
                message: 'Boom',
                status: 500,
              }
            },
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'unknown',
    } satisfies Pick<DiscordChannelMessageError, 'code'>)
  })
})
