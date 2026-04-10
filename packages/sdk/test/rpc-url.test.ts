import { describe, expect, test } from 'bun:test'

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
