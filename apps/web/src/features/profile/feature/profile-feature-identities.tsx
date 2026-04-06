import { useAppSession } from '@/features/auth/data-access/use-app-session'
import { useProfileListIdentities } from '../data-access/use-profile-list-identities'
import { useProfileListSolanaWallets } from '../data-access/use-profile-list-solana-wallets'
import { ProfileUiIdentitiesCard } from '../ui/profile-ui-identities-card'
import { ProfileFeatureSolanaCard } from './profile-feature-solana-card'

export function ProfileFeatureIdentities() {
  const { data: session } = useAppSession()
  const identities = useProfileListIdentities(session?.user.id ?? '')
  const solanaWallets = useProfileListSolanaWallets(session?.user.id ?? '')

  if (!session) {
    return null
  }

  return (
    <div className="grid gap-6">
      <ProfileFeatureSolanaCard
        isPending={solanaWallets.isPending}
        solanaWallets={solanaWallets.data?.solanaWallets ?? []}
        userId={session.user.id}
      />
      <ProfileUiIdentitiesCard identities={identities.data?.identities ?? []} isPending={identities.isPending} />
    </div>
  )
}
