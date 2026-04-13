import { useWalletUi } from '@wallet-ui/react'
import type { AppAuthState, AppSession } from '@/features/auth/data-access/get-app-auth-state.ts'
import type { ProfileIdentityEntity } from '@tokengator/sdk'
import { AuthFeatureSolanaActions } from '@/features/auth/feature/auth-feature-solana-actions.tsx'
import { useProfileListSolanaWallets } from '@/features/profile/data-access/use-profile-list-solana-wallets.tsx'
import { useProfileSolanaWalletDelete } from '@/features/profile/data-access/use-profile-solana-wallet-delete.tsx'
import { useProfileSolanaWalletSetPrimary } from '@/features/profile/data-access/use-profile-solana-wallet-set-primary.tsx'
import { useProfileSolanaWalletUpdate } from '@/features/profile/data-access/use-profile-solana-wallet-update.tsx'
import { ProfileUiUserIdentityCard } from '@/features/profile/ui/profile-ui-user-identity-card.tsx'
import { SolanaProvider } from '@/lib/solana-provider.tsx'

import { ProfileFeatureSolanaIdentityRowActions } from './profile-feature-solana-identity-row-actions.tsx'

function ProfileFeatureSolanaIdentityCardContent({
  identities,
  initialSolanaWallets,
  isPending = false,
  session,
}: {
  identities: ProfileIdentityEntity[]
  initialSolanaWallets: AppAuthState['solanaWallets']
  isPending?: boolean
  session: AppSession
}) {
  const { account, disconnect, wallet } = useWalletUi()
  const userId = session.user.id
  const deleteSolanaWallet = useProfileSolanaWalletDelete(userId)
  const setPrimarySolanaWallet = useProfileSolanaWalletSetPrimary(userId)
  const solanaWallets = useProfileListSolanaWallets(userId, {
    initialData: initialSolanaWallets ?? undefined,
  })
  const updateSolanaWallet = useProfileSolanaWalletUpdate(userId)
  const connectedWallet = account && wallet ? { address: account.address, name: wallet.name } : null
  const linkedWalletById = new Map(solanaWallets.data?.solanaWallets.map((entry) => [entry.id, entry]) ?? [])
  const linkedProviderIds = [...new Set(identities.map((identity) => identity.providerId))].sort((left, right) =>
    left.localeCompare(right),
  )

  return (
    <ProfileUiUserIdentityCard
      footer={<AuthFeatureSolanaActions action="link" linkedProviderIds={linkedProviderIds} />}
      identities={identities}
      isPending={isPending}
      provider="solana"
      renderRowActions={(identity) => (
        <ProfileFeatureSolanaIdentityRowActions
          connectedWallet={connectedWallet}
          deletingWalletCounts={deleteSolanaWallet.deletingWalletCounts}
          identity={identity}
          onDeleteWallet={deleteSolanaWallet.deleteSolanaWallet}
          onDisconnectWallet={connectedWallet ? () => disconnect() : undefined}
          onSetPrimaryWallet={setPrimarySolanaWallet.setPrimarySolanaWallet}
          onUpdateWallet={updateSolanaWallet.updateSolanaWallet}
          settingPrimaryWalletCounts={setPrimarySolanaWallet.settingPrimaryWalletCounts}
          updatingWalletCounts={updateSolanaWallet.updatingWalletCounts}
          wallet={identity.referenceId ? (linkedWalletById.get(identity.referenceId) ?? null) : null}
        />
      )}
    />
  )
}

export function ProfileFeatureSolanaIdentityCard({
  identities,
  initialSolanaWallets,
  isPending = false,
  session,
}: {
  identities: ProfileIdentityEntity[]
  initialSolanaWallets: AppAuthState['solanaWallets']
  isPending?: boolean
  session: AppSession
}) {
  return (
    <SolanaProvider>
      <ProfileFeatureSolanaIdentityCardContent
        identities={identities}
        initialSolanaWallets={initialSolanaWallets}
        isPending={isPending}
        session={session}
      />
    </SolanaProvider>
  )
}
