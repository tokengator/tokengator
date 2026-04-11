import type { AdminUserDetailEntity } from '@tokengator/sdk'

import { Route as RootRoute } from '@/routes/__root'

import { useAdminUserIdentitiesQuery } from '../data-access/use-admin-user-identities-query'
import { useAdminUserSolanaWalletDelete } from '../data-access/use-admin-user-solana-wallet-delete'
import { useAdminUserSolanaWalletSetPrimary } from '../data-access/use-admin-user-solana-wallet-set-primary'
import { useAdminUserSolanaWalletUpdate } from '../data-access/use-admin-user-solana-wallet-update'
import { AdminUserIdentitiesUiContent } from '../ui/admin-user-identities-ui-content'

export function AdminUserFeatureIdentities({ initialUser }: { initialUser: AdminUserDetailEntity }) {
  const { appConfig } = RootRoute.useRouteContext()
  const deleteSolanaWallet = useAdminUserSolanaWalletDelete(initialUser.id)
  const identities = useAdminUserIdentitiesQuery(initialUser.id)
  const setPrimarySolanaWallet = useAdminUserSolanaWalletSetPrimary(initialUser.id)
  const updateSolanaWallet = useAdminUserSolanaWalletUpdate(initialUser.id)

  if (identities.error) {
    return <div className="text-destructive text-sm">{identities.error.message}</div>
  }

  return (
    <AdminUserIdentitiesUiContent
      clusterName={appConfig.solanaCluster}
      deletePendingWalletCounts={deleteSolanaWallet.deletingWalletCounts}
      identities={identities.data?.identities ?? []}
      isIdentityPending={identities.isPending}
      isWalletPending={identities.isPending}
      onDeleteWallet={deleteSolanaWallet.deleteSolanaWallet}
      onSetPrimaryWallet={setPrimarySolanaWallet.setPrimarySolanaWallet}
      onUpdateWallet={updateSolanaWallet.updateSolanaWallet}
      setPrimaryPendingWalletCounts={setPrimarySolanaWallet.settingPrimaryWalletCounts}
      updatePendingWalletCounts={updateSolanaWallet.updatingWalletCounts}
      wallets={identities.data?.solanaWallets ?? []}
    />
  )
}
