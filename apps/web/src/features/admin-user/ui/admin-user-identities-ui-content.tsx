import type { ProfileIdentityEntity, ProfileSolanaWalletEntity } from '@tokengator/sdk'

import { ProfileUiAdminIdentitiesCard } from '@/features/profile/ui/profile-ui-admin-identities-card.tsx'
import { ProfileUiSolanaCard } from '@/features/profile/ui/profile-ui-solana-card'

export function AdminUserIdentitiesUiContent(props: {
  clusterName?: string
  deletePendingWalletCounts?: Record<string, number>
  identities: ProfileIdentityEntity[]
  isIdentityPending: boolean
  isWalletPending: boolean
  onDeleteWallet?: (id: string) => Promise<boolean>
  onSetPrimaryWallet?: (id: string) => Promise<boolean>
  onUpdateWallet?: (input: { id: string; name: string }) => Promise<{ didSucceed: boolean; name: string | null }>
  setPrimaryPendingWalletCounts?: Record<string, number>
  updatePendingWalletCounts?: Record<string, number>
  wallets: ProfileSolanaWalletEntity[]
}) {
  const {
    clusterName = 'devnet',
    deletePendingWalletCounts = {},
    identities,
    isIdentityPending,
    isWalletPending,
    onDeleteWallet = async () => false,
    onSetPrimaryWallet = async () => false,
    onUpdateWallet = async () => ({ didSucceed: false, name: null }),
    setPrimaryPendingWalletCounts = {},
    updatePendingWalletCounts = {},
    wallets,
  } = props

  return (
    <div className="grid gap-6">
      <ProfileUiSolanaCard
        clusterName={clusterName}
        connectedWallet={null}
        deletePendingWalletCounts={deletePendingWalletCounts}
        isPending={isWalletPending}
        linkActions={null}
        onDeleteWallet={onDeleteWallet}
        onSetPrimaryWallet={onSetPrimaryWallet}
        onUpdateWallet={onUpdateWallet}
        setPrimaryPendingWalletCounts={setPrimaryPendingWalletCounts}
        solanaWallets={wallets}
        updatePendingWalletCounts={updatePendingWalletCounts}
      />
      <ProfileUiAdminIdentitiesCard identities={identities} isPending={isIdentityPending} />
    </div>
  )
}
