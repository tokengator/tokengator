import type { AppSession } from '@/features/auth/data-access/get-app-auth-state'
import { SolanaProvider } from '@/lib/solana-provider'
import { useProfileListIdentities } from '../data-access/use-profile-list-identities'
import { ProfileUiIdentitiesCard } from '../ui/profile-ui-identities-card'
import { ProfileFeatureSolanaCard } from './profile-feature-solana-card'

export function ProfileFeatureIdentities({ session }: { session: AppSession }) {
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
