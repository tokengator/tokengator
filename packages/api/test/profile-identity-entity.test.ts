import { describe, expect, test } from 'bun:test'
import { toProfileIdentityEntity } from '../src/features/profile/data-access/profile.entity'

function createIdentity(overrides: Partial<Parameters<typeof toProfileIdentityEntity>[0]> = {}) {
  return {
    avatarUrl: null,
    displayName: null,
    email: null,
    id: 'identity-1',
    isPrimary: false,
    linkedAt: new Date('2026-01-01T00:00:00.000Z'),
    provider: 'discord' as const,
    providerId: 'provider-id-1',
    referenceId: 'reference-1',
    referenceType: 'account' as const,
    username: null,
    ...overrides,
  }
}

describe('toProfileIdentityEntity', () => {
  test('falls back to providerId when other label fields are missing', () => {
    expect(toProfileIdentityEntity(createIdentity()).label).toBe('provider-id-1')
  })

  test('prefers displayName over other label fields', () => {
    expect(
      toProfileIdentityEntity(
        createIdentity({
          displayName: 'Alice',
          email: 'alice@example.com',
          providerId: 'provider-id-1',
          username: 'alice',
        }),
      ).label,
    ).toBe('Alice')
  })

  test('falls back to providerId when displayName and username are missing even if email exists', () => {
    expect(
      toProfileIdentityEntity(
        createIdentity({
          email: 'alice@example.com',
        }),
      ).label,
    ).toBe('provider-id-1')
  })

  test('prefers username when displayName is missing', () => {
    expect(
      toProfileIdentityEntity(
        createIdentity({
          email: 'alice@example.com',
          username: 'alice',
        }),
      ).label,
    ).toBe('alice')
  })

  test('treats blank label candidates as missing', () => {
    expect(
      toProfileIdentityEntity(
        createIdentity({
          displayName: '   ',
          email: ' alice@example.com ',
          username: '\n',
        }),
      ).label,
    ).toBe('provider-id-1')
  })

  test('includes the backing reference metadata', () => {
    expect(toProfileIdentityEntity(createIdentity())).toMatchObject({
      referenceId: 'reference-1',
      referenceType: 'account',
    })
  })
})
