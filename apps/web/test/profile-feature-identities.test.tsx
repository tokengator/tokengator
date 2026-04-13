import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ProfileListIdentitiesByUsernameResult } from '@tokengator/sdk'

const viewerIdentities = {
  identities: [
    {
      avatarUrl: null,
      displayName: 'Alice on Discord',
      email: null,
      id: 'identity-1',
      isPrimary: true,
      linkedAt: new Date('2026-04-11T00:00:00.000Z').getTime(),
      provider: 'discord',
      providerId: 'discord-alice',
      username: 'alice',
    },
  ],
  solanaWallets: [
    {
      address: 'wallet-1-address',
      displayName: 'Primary Wallet',
      id: 'wallet-1',
      isPrimary: true,
      name: 'Primary Wallet',
    },
  ],
} satisfies ProfileListIdentitiesByUsernameResult

let ProfileFeatureIdentities: typeof import('../src/features/profile/feature/profile-feature-identities').ProfileFeatureIdentities
let profileIdentitiesData: typeof viewerIdentities | null = viewerIdentities

beforeAll(async () => {
  mock.module('@/routes/__root', () => ({
    Route: {
      useRouteContext: () => ({
        appConfig: {
          solanaCluster: 'devnet',
        },
      }),
    },
  }))

  mock.module('../src/features/profile/data-access/use-profile-identities-by-username-query', () => ({
    useProfileIdentitiesByUsernameQuery: () => ({
      data: profileIdentitiesData,
      error: null,
      isPending: false,
    }),
  }))

  mock.module('../src/features/profile/data-access/use-profile-list-identities', () => ({
    useProfileListIdentities: () => ({
      data: {
        identities: [],
      },
      isPending: false,
    }),
  }))

  mock.module('../src/features/profile/feature/profile-feature-solana-card', () => ({
    ProfileFeatureSolanaCard: () => <div>owner-solana-card</div>,
  }))

  ;({ ProfileFeatureIdentities } = await import('../src/features/profile/feature/profile-feature-identities'))
})

beforeEach(() => {
  profileIdentitiesData = viewerIdentities
})

afterAll(() => {
  mock.restore()
})

describe('ProfileFeatureIdentities', () => {
  test('renders a read-only identities view for non-owners', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureIdentities
        initialIdentities={viewerIdentities}
        isOwner={false}
        isPrivate={false}
        session={{
          user: {
            id: 'viewer-user-id',
            name: 'Viewer',
            username: 'viewer',
          },
        }}
        username="alice"
      />,
    )

    expect(markup).toContain('Alice on Discord')
    expect(markup).toContain('Primary Wallet')
    expect(markup).not.toContain('Delete')
    expect(markup).not.toContain('Disconnect')
    expect(markup).not.toContain('Make Primary')
    expect(markup).not.toContain('Save')
    expect(markup).not.toContain('alice@example.com')
    expect(markup).toContain('discord-alice')
  })

  test('renders a private profile notice instead of details', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureIdentities
        initialIdentities={null}
        isOwner={false}
        isPrivate
        session={{
          user: {
            id: 'viewer-user-id',
            name: 'Viewer',
            username: 'viewer',
          },
        }}
        username="alice"
      />,
    )

    expect(markup).toContain('Private Profile')
    expect(markup).toContain('their profile details are private')
    expect(markup).not.toContain('Alice on Discord')
    expect(markup).not.toContain('Primary Wallet')
  })
})
