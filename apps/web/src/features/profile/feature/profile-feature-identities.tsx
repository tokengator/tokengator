import type { AppSession } from '@/features/auth/data-access/get-app-auth-state'
import type { ProfileListIdentitiesByUsernameResult } from '@tokengator/sdk'
import { ProfileFeatureIdentitiesOwner } from '@/features/profile/feature/profile-feature-identities-owner.tsx'
import { ProfileFeatureIdentitiesViewer } from '@/features/profile/feature/profile-feature-identities-viewer.tsx'
import { ProfileUiPrivate } from '@/features/profile/ui/profile-ui-private.tsx'

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
    return <ProfileUiPrivate />
  }

  return <ProfileFeatureIdentitiesViewer initialIdentities={initialIdentities} username={username} />
}
