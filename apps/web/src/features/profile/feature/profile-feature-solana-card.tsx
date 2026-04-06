import { useWalletUi } from '@wallet-ui/react'

import type { AppSession } from '@/features/auth/data-access/get-app-auth-state'
import { AuthFeatureSolanaActions } from '@/features/auth/feature/auth-feature-solana-actions'
import { Route as RootRoute } from '@/routes/__root'
import { useProfileListSolanaWallets } from '../data-access/use-profile-list-solana-wallets'
import { useProfileSolanaWalletDelete } from '../data-access/use-profile-solana-wallet-delete'
import { useProfileSolanaWalletSetPrimary } from '../data-access/use-profile-solana-wallet-set-primary'
import { useProfileSolanaWalletUpdate } from '../data-access/use-profile-solana-wallet-update'
import { ProfileUiSolanaCard } from '../ui/profile-ui-solana-card'

export function ProfileFeatureSolanaCard({ session }: { session: AppSession }) {
  const { appConfig } = RootRoute.useRouteContext()
  const { account, disconnect, wallet } = useWalletUi()
  const userId = session.user.id
  const solanaWallets = useProfileListSolanaWallets(userId)
  const deleteSolanaWallet = useProfileSolanaWalletDelete(userId)
  const setPrimarySolanaWallet = useProfileSolanaWalletSetPrimary(userId)
  const updateSolanaWallet = useProfileSolanaWalletUpdate(userId)

  return (
    <ProfileUiSolanaCard
      clusterName={appConfig.solanaCluster}
      connectedWallet={account && wallet ? { address: account.address, name: wallet.name } : null}
      deletePendingWalletCounts={deleteSolanaWallet.deletingWalletCounts}
      isPending={solanaWallets.isPending}
      linkActions={<AuthFeatureSolanaActions action="link" />}
      onDeleteWallet={deleteSolanaWallet.deleteSolanaWallet}
      onDisconnectWallet={account && wallet ? () => disconnect() : undefined}
      onSetPrimaryWallet={setPrimarySolanaWallet.setPrimarySolanaWallet}
      onUpdateWallet={updateSolanaWallet.updateSolanaWallet}
      setPrimaryPendingWalletCounts={setPrimarySolanaWallet.settingPrimaryWalletCounts}
      solanaWallets={solanaWallets.data?.solanaWallets ?? []}
      updatePendingWalletCounts={updateSolanaWallet.updatingWalletCounts}
    />
  )
}
