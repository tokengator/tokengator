import type { AppAuthState, AppSession } from '@/features/auth/data-access/get-app-auth-state.ts'
import { useProfileListIdentities } from '@/features/profile/data-access/use-profile-list-identities.tsx'
import { ProfileFeatureSolanaIdentityCard } from '@/features/profile/feature/profile-feature-solana-identity-card.tsx'
import { getIdentityProviderGroups } from '@/features/profile/ui/get-identity-provider-groups.tsx'
import { ProfileUiUserIdentityCard } from '@/features/profile/ui/profile-ui-user-identity-card.tsx'

export function ProfileFeatureIdentitiesOwner({
  initialIdentities,
  initialSolanaWallets,
  session,
}: {
  initialIdentities: AppAuthState['identities']
  initialSolanaWallets: AppAuthState['solanaWallets']
  session: AppSession
}) {
  const identities = useProfileListIdentities(session.user.id, {
    initialData: initialIdentities ?? undefined,
  })
  const identityProviderGroups = getIdentityProviderGroups(identities.data?.identities ?? [], {
    includeProviders: ['solana'],
  })

  return (
    <div className="grid gap-6">
      {identityProviderGroups.map((identityProviderGroup) =>
        identityProviderGroup.provider === 'solana' ? (
          <ProfileFeatureSolanaIdentityCard
            identities={identityProviderGroup.identities}
            initialSolanaWallets={initialSolanaWallets}
            isPending={identities.isPending}
            key={identityProviderGroup.provider}
            session={session}
          />
        ) : (
          <ProfileUiUserIdentityCard
            identities={identityProviderGroup.identities}
            isPending={identities.isPending}
            key={identityProviderGroup.provider}
            provider={identityProviderGroup.provider}
          />
        ),
      )}
    </div>
  )
}
