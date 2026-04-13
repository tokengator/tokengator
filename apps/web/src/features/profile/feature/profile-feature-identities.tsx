import type { AppAuthState, AppSession } from '@/features/auth/data-access/get-app-auth-state'
import type { ProfileListIdentitiesByUsernameResult } from '@tokengator/sdk'
import { ProfileFeatureIdentitiesOwner } from '@/features/profile/feature/profile-feature-identities-owner.tsx'
import { ProfileFeatureIdentitiesViewer } from '@/features/profile/feature/profile-feature-identities-viewer.tsx'
import { ProfileUiPrivate } from '@/features/profile/ui/profile-ui-private.tsx'

export function ProfileFeatureIdentities({
  initialIdentities,
  initialOwnerIdentities,
  initialOwnerSolanaWallets,
  isOwner,
  isPrivate,
  session,
  username,
}: {
  initialIdentities: ProfileListIdentitiesByUsernameResult | null
  initialOwnerIdentities: AppAuthState['identities']
  initialOwnerSolanaWallets: AppAuthState['solanaWallets']
  isOwner: boolean
  isPrivate: boolean
  session: AppSession
  username: string
}) {
  if (isOwner) {
    return (
      <ProfileFeatureIdentitiesOwner
        initialIdentities={initialOwnerIdentities}
        initialSolanaWallets={initialOwnerSolanaWallets}
        session={session}
      />
    )
  }

  if (isPrivate) {
    return <ProfileUiPrivate />
  }

  return <ProfileFeatureIdentitiesViewer initialIdentities={initialIdentities} username={username} />
}
