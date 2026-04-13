import type { AppSession } from '@/features/auth/data-access/get-app-auth-state.ts'
import { useProfileListIdentities } from '@/features/profile/data-access/use-profile-list-identities.tsx'
import { ProfileFeatureSolanaCard } from '@/features/profile/feature/profile-feature-solana-card.tsx'
import { ProfileUiIdentitiesCard } from '@/features/profile/ui/profile-ui-identities-card.tsx'
import { SolanaProvider } from '@/lib/solana-provider.tsx'

export function ProfileFeatureIdentitiesOwner({ session }: { session: AppSession }) {
  const identities = useProfileListIdentities(session.user.id)

  return (
    <div className="grid gap-6">
      <ProfileUiIdentitiesCard identities={identities.data?.identities ?? []} isPending={identities.isPending} />
      <SolanaProvider>
        <ProfileFeatureSolanaCard session={session} />
      </SolanaProvider>
    </div>
  )
}
