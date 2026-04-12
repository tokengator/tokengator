import type { AppSession } from '@/features/auth/data-access/get-app-auth-state'
import type { ProfileListIdentitiesByUsernameResult } from '@tokengator/sdk'
import { SolanaProvider } from '@/lib/solana-provider'
import { Route as RootRoute } from '@/routes/__root'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { useProfileIdentitiesByUsernameQuery } from '../data-access/use-profile-identities-by-username-query'
import { useProfileListIdentities } from '../data-access/use-profile-list-identities'
import { ProfileUiIdentitiesCard } from '../ui/profile-ui-identities-card'
import { ProfileUiSolanaCard } from '../ui/profile-ui-solana-card'
import { ProfileFeatureSolanaCard } from './profile-feature-solana-card'

function ProfileFeatureIdentitiesOwner({ session }: { session: AppSession }) {
  const identities = useProfileListIdentities(session.user.id)

  return (
    <div className="grid gap-6">
      <SolanaProvider>
        <ProfileFeatureSolanaCard session={session} />
      </SolanaProvider>
      <ProfileUiIdentitiesCard identities={identities.data?.identities ?? []} isPending={identities.isPending} />
    </div>
  )
}

function ProfileFeatureIdentitiesPrivate() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Private Profile</CardTitle>
        <CardDescription>This user exists, but their profile details are private.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Linked identities and wallets are only visible to the account owner.
      </CardContent>
    </Card>
  )
}

function ProfileFeatureIdentitiesViewer({
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
      <ProfileUiIdentitiesCard
        description="Linked identities for this TokenGator account."
        identities={identities.data?.identities ?? []}
        isPending={identities.isPending}
      />
    </div>
  )
}

export function ProfileFeatureIdentities({
  initialIdentities,
  isOwner,
  isPrivate,
  session,
  username,
}: {
  initialIdentities: ProfileListIdentitiesByUsernameResult | null
  isOwner: boolean
  isPrivate: boolean
  session: AppSession
  username: string
}) {
  if (isOwner) {
    return <ProfileFeatureIdentitiesOwner session={session} />
  }

  if (isPrivate) {
    return <ProfileFeatureIdentitiesPrivate />
  }

  return <ProfileFeatureIdentitiesViewer initialIdentities={initialIdentities} username={username} />
}
