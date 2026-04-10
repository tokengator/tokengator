import { describe, expect, test } from 'bun:test'

import { createOrpcClient } from '../src/index'
import { resolveRpcUrl } from '../src/lib/rpc-url'

describe('resolveRpcUrl', () => {
  test('joins a bare origin with the default rpc path', () => {
    expect(resolveRpcUrl('https://api.tokengator.test', '/rpc')).toBe('https://api.tokengator.test/rpc')
  })

  test('normalizes a trailing slash on the base URL and a missing slash on the rpc path', () => {
    expect(resolveRpcUrl('https://api.tokengator.test/', 'rpc')).toBe('https://api.tokengator.test/rpc')
  })

  test('preserves an existing pathname on the base URL', () => {
    expect(resolveRpcUrl('https://api.tokengator.test/base/', '/rpc')).toBe('https://api.tokengator.test/base/rpc')
  })

  test('supports a same-origin relative rpc path', () => {
    expect(resolveRpcUrl('', '/rpc')).toBe('/rpc')
  })
})

describe('createOrpcClient', () => {
  test('supports an async lazy base URL', async () => {
    let requestedUrl = ''
    const client = createOrpcClient({
      baseUrl: async () => 'https://web.tokengator.test',
      fetch: async (input) => {
        requestedUrl = input instanceof Request ? input.url : input.toString()

        throw new Error('stop')
      },
    })

    await expect(client.core.healthCheck()).rejects.toThrow('stop')
    expect(requestedUrl).toBe('https://web.tokengator.test/rpc/core/healthCheck')
  })

  test('supports a lazy base URL', async () => {
    let requestedUrl = ''
    const client = createOrpcClient({
      baseUrl: () => 'https://web.tokengator.test',
      fetch: async (input) => {
        requestedUrl = input instanceof Request ? input.url : input.toString()

        throw new Error('stop')
      },
    })

    await expect(client.core.healthCheck()).rejects.toThrow('stop')
    expect(requestedUrl).toBe('https://web.tokengator.test/rpc/core/healthCheck')
  })
})
