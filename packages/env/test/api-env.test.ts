import { describe, expect, test } from 'bun:test'

import { parseAdminEmailPatterns, parseStringList } from '../src/lib/server-env-list'

describe('parseAdminEmailPatterns', () => {
  test('lowercases, trims, dedupes, and sorts BETTER_AUTH_ADMIN_EMAILS values', () => {
    expect(parseAdminEmailPatterns('  zed@example.com, Alice@Example.com, zed@example.com  ')).toEqual([
      'alice@example.com',
      'zed@example.com',
    ])
  })
})

describe('parseStringList', () => {
  test('returns an empty list when SOLANA_ADMIN_ADDRESSES is unset', () => {
    expect(parseStringList()).toEqual([])
  })

  test('trims, dedupes, sorts, and preserves case for SOLANA_ADMIN_ADDRESSES', () => {
    expect(
      parseStringList(
        '  vote111111111111111111111111111111111111111, So11111111111111111111111111111111111111112, vote111111111111111111111111111111111111111  ',
      ),
    ).toEqual(['So11111111111111111111111111111111111111112', 'vote111111111111111111111111111111111111111'])
  })
})
