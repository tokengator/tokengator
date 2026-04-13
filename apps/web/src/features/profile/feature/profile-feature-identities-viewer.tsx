import type { ProfileListIdentitiesByUsernameResult } from '@tokengator/sdk'
import { useProfileIdentitiesByUsernameQuery } from '@/features/profile/data-access/use-profile-identities-by-username-query.tsx'
import { ProfileUiIdentitiesCard } from '@/features/profile/ui/profile-ui-identities-card.tsx'
import { ProfileUiSolanaCard } from '@/features/profile/ui/profile-ui-solana-card.tsx'
import { Route as RootRoute } from '@/routes/__root.tsx'

export function ProfileFeatureIdentitiesViewer({
  initialIdentities,
  username,
}: {
  initialIdentities: ProfileListIdentitiesByUsernameResult | null
  username: string
}) {
  const { appConfig } = RootRoute.useRouteContext()
  const identities = useProfileIdentitiesByUsernameQuery(username, {
    initialData: initialIdentities,
  })

  if (identities.error) {
    return <div className="text-destructive text-sm">{identities.error.message}</div>
  }

  if (!identities.isPending && !identities.data) {
    return null
  }

  return (
    <div className="grid gap-6">
      <ProfileUiIdentitiesCard
        description="Linked identities for this TokenGator account."
        identities={identities.data?.identities ?? []}
        isPending={identities.isPending}
      />
      <ProfileUiSolanaCard
        clusterName={appConfig.solanaCluster}
        connectedWallet={null}
        deletePendingWalletCounts={{}}
        isPending={identities.isPending}
        linkActions={null}
        onDeleteWallet={async () => false}
        onSetPrimaryWallet={async () => false}
        onUpdateWallet={async () => ({ didSucceed: false, name: null })}
        readOnly
        setPrimaryPendingWalletCounts={{}}
        solanaWallets={identities.data?.solanaWallets ?? []}
        updatePendingWalletCounts={{}}
      />
    </div>
  )
}
