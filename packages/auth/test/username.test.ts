import { describe, expect, test } from 'bun:test'

import { getDiscordUsername, normalizeUsername } from '../src/lib/username'

describe('normalizeUsername', () => {
  test('lowercases mixed-case usernames', () => {
    expect(normalizeUsername('Alice.Example')).toBe('alice.example')
  })

  test('preserves digits, periods, and underscores', () => {
    expect(normalizeUsername('a1_b.2')).toBe('a1_b.2')
  })

  test('does not rewrite consecutive periods', () => {
    expect(normalizeUsername('Alice..Example')).toBe('alice..example')
  })
})

describe('getDiscordUsername', () => {
  test('normalizes Discord usernames', () => {
    expect(getDiscordUsername('Alice.Example')).toBe('alice.example')
  })

  test('returns null for invalid Discord usernames', () => {
    expect(getDiscordUsername('alice-example')).toBeNull()
  })
})
