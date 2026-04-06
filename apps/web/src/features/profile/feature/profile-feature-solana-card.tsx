import { useWalletUi } from '@wallet-ui/react'

import { AuthFeatureSolanaActions } from '@/features/auth/feature/auth-feature-solana-actions'
import { Route as RootRoute } from '@/routes/__root'
import { useProfileSolanaWalletDelete } from '../data-access/use-profile-solana-wallet-delete'
import { useProfileSolanaWalletSetPrimary } from '../data-access/use-profile-solana-wallet-set-primary'
import { useProfileSolanaWalletUpdate } from '../data-access/use-profile-solana-wallet-update'
import { ProfileUiSolanaCard, type ProfileSolanaWallet } from '../ui/profile-ui-solana-card'

export function ProfileFeatureSolanaCard({
  isPending = false,
  solanaWallets,
  userId,
}: {
  isPending?: boolean
  solanaWallets: ProfileSolanaWallet[]
  userId: string
}) {
  const { appConfig } = RootRoute.useRouteContext()
  const { account, disconnect, wallet } = useWalletUi()
  const deleteSolanaWallet = useProfileSolanaWalletDelete(userId)
  const setPrimarySolanaWallet = useProfileSolanaWalletSetPrimary(userId)
  const updateSolanaWallet = useProfileSolanaWalletUpdate(userId)

  return (
    <ProfileUiSolanaCard
      clusterName={appConfig.solanaCluster}
      connectedWallet={account && wallet ? { address: account.address, name: wallet.name } : null}
      deletePendingWalletCounts={deleteSolanaWallet.deletingWalletCounts}
      isPending={isPending}
      linkActions={<AuthFeatureSolanaActions action="link" />}
      onDeleteWallet={deleteSolanaWallet.deleteSolanaWallet}
      onDisconnectWallet={account && wallet ? () => disconnect() : undefined}
      onSetPrimaryWallet={setPrimarySolanaWallet.setPrimarySolanaWallet}
      onUpdateWallet={updateSolanaWallet.updateSolanaWallet}
      setPrimaryPendingWalletCounts={setPrimarySolanaWallet.settingPrimaryWalletCounts}
      solanaWallets={solanaWallets}
      updatePendingWalletCounts={updateSolanaWallet.updatingWalletCounts}
    />
  )
}
