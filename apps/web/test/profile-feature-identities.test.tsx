import type { ReactNode } from 'react'
import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ProfileListIdentitiesByUsernameResult } from '@tokengator/sdk'

const viewerIdentities = {
  identities: [
    {
      avatarUrl: null,
      displayName: 'Burner Wallet',
      email: null,
      id: 'identity-2',
      isPrimary: false,
      label: 'Burner Wallet',
      linkedAt: new Date('2026-04-12T00:00:00.000Z').getTime(),
      provider: 'solana',
      providerId: 'BumrJWH5Kf4MXZ5bEg7VyZY6oXAMr78jXC1mFiDAE3u3',
      referenceId: 'wallet-1',
      referenceType: 'solana_wallet',
      username: null,
    },
    {
      avatarUrl: null,
      displayName: 'Alice on Discord',
      email: null,
      id: 'identity-1',
      isPrimary: true,
      label: 'Alice on Discord',
      linkedAt: new Date('2026-04-11T00:00:00.000Z').getTime(),
      provider: 'discord',
      providerId: 'discord-alice',
      referenceId: 'account-1',
      referenceType: 'account',
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
let ownerIdentitiesData = {
  identities: viewerIdentities.identities,
}
let profileIdentitiesData: typeof viewerIdentities | null = viewerIdentities
let solanaWalletData = {
  solanaWallets: viewerIdentities.solanaWallets,
}

beforeAll(async () => {
  mock.module('@wallet-ui/react', () => ({
    useWalletUi: () => ({
      account: null,
      disconnect: () => undefined,
      wallet: null,
    }),
  }))

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
    getProfileListIdentitiesQueryKey: () => ['profile', 'identities'],
    useProfileListIdentities: () => ({
      data: ownerIdentitiesData,
      isPending: false,
    }),
  }))

  mock.module('../src/features/profile/data-access/use-profile-list-solana-wallets', () => ({
    getProfileListSolanaWalletsQueryKey: () => ['profile', 'solana-wallets'],
    useProfileListSolanaWallets: () => ({
      data: solanaWalletData,
      isPending: false,
    }),
  }))

  mock.module('../src/features/profile/data-access/use-profile-solana-wallet-delete', () => ({
    useProfileSolanaWalletDelete: () => ({
      deleteSolanaWallet: async () => false,
      deletingWalletCounts: {},
    }),
  }))

  mock.module('../src/features/profile/data-access/use-profile-solana-wallet-set-primary', () => ({
    useProfileSolanaWalletSetPrimary: () => ({
      setPrimarySolanaWallet: async () => false,
      settingPrimaryWalletCounts: {},
    }),
  }))

  mock.module('../src/features/profile/data-access/use-profile-solana-wallet-update', () => ({
    useProfileSolanaWalletUpdate: () => ({
      updateSolanaWallet: async () => ({ didSucceed: false, name: null }),
      updatingWalletCounts: {},
    }),
  }))

  mock.module('../src/features/auth/feature/auth-feature-solana-actions', () => ({
    AuthFeatureSolanaActions: () => <div>link-solana-wallet</div>,
  }))

  mock.module('../src/features/shell/ui/shell-ui-debug-button', () => ({
    ShellUiDebugButton: () => <div>debug-button</div>,
  }))

  mock.module('../src/lib/solana-provider', () => ({
    SolanaProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  }))

  ;({ ProfileFeatureIdentities } = await import('../src/features/profile/feature/profile-feature-identities'))
})

beforeEach(() => {
  ownerIdentitiesData = {
    identities: viewerIdentities.identities,
  }
  profileIdentitiesData = viewerIdentities
  solanaWalletData = {
    solanaWallets: viewerIdentities.solanaWallets,
  }
})

afterAll(() => {
  mock.restore()
})

describe('ProfileFeatureIdentities', () => {
  test('renders a read-only identities view for non-owners', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureIdentities
        initialIdentities={viewerIdentities}
        initialOwnerIdentities={null}
        initialOwnerSolanaWallets={null}
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
    expect(markup).toContain('Burner Wallet')
    expect(markup).toContain('Discord')
    expect(markup).toContain('Solana')
    expect(markup).not.toContain('Linked identities for this TokenGator account.')
    expect(markup).not.toContain('Linked identities for your TokenGator account.')
    expect(markup.indexOf('Discord')).toBeLessThan(markup.indexOf('Solana'))
    expect(markup.indexOf('Alice on Discord')).toBeLessThan(markup.indexOf('Burner Wallet'))
    expect(markup).not.toContain('Delete')
    expect(markup).not.toContain('Disconnect')
    expect(markup).not.toContain('Make Primary')
    expect(markup).not.toContain('Save')
    expect(markup).not.toContain('Solana Wallets')
    expect(markup).not.toContain('link-solana-wallet')
    expect(markup).not.toContain('Open Solana wallet actions')
    expect(markup).not.toContain('alice@example.com')
    expect(markup).toContain('discord-alice')
    expect(markup).toContain('BumrJWH5Kf4MXZ5bEg7VyZY6oXAMr78jXC1mFiDAE3u3')
  })

  test('renders owner-only Solana actions inside the provider card', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureIdentities
        initialIdentities={null}
        initialOwnerIdentities={ownerIdentitiesData}
        initialOwnerSolanaWallets={solanaWalletData}
        isOwner
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
    expect(markup).toContain('Burner Wallet')
    expect(markup).toContain('link-solana-wallet')
    expect(markup).toContain('Open Solana wallet actions')
    expect(markup).not.toContain('Solana Wallets')
  })

  test('renders only the empty Solana card for owners without linked identities', () => {
    ownerIdentitiesData = {
      identities: [],
    }
    solanaWalletData = {
      solanaWallets: [],
    }

    const markup = renderToStaticMarkup(
      <ProfileFeatureIdentities
        initialIdentities={null}
        initialOwnerIdentities={ownerIdentitiesData}
        initialOwnerSolanaWallets={solanaWalletData}
        isOwner
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

    expect(markup).toContain('link-solana-wallet')
    expect(markup).toContain('No linked Solana identities yet.')
    expect(markup).not.toContain('No linked Discord identities yet.')
  })

  test('does not render empty provider cards for viewers without linked identities', () => {
    profileIdentitiesData = {
      identities: [],
      solanaWallets: [],
    }

    const markup = renderToStaticMarkup(
      <ProfileFeatureIdentities
        initialIdentities={profileIdentitiesData}
        initialOwnerIdentities={null}
        initialOwnerSolanaWallets={null}
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

    expect(markup).not.toContain('No linked Discord identities yet.')
    expect(markup).not.toContain('No linked Solana identities yet.')
  })

  test('renders a private profile notice instead of details', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureIdentities
        initialIdentities={null}
        initialOwnerIdentities={null}
        initialOwnerSolanaWallets={null}
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
