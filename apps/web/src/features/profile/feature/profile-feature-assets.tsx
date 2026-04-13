import type { ProfileListCommunitiesByUsernameResult } from '@tokengator/sdk'
import { ProfileFeatureAssetsOwner } from '@/features/profile/feature/profile-feature-assets-owner.tsx'
import { ProfileFeatureAssetsViewer } from '@/features/profile/feature/profile-feature-assets-viewer.tsx'
import { ProfileUiPrivate } from '@/features/profile/ui/profile-ui-private.tsx'

export function ProfileFeatureAssets({
  initialCommunities,
  isOwner,
  isPrivate,
  username,
}: {
  initialCommunities: ProfileListCommunitiesByUsernameResult | null
  isOwner: boolean
  isPrivate: boolean
  username: string
}) {
  if (isOwner) {
    return <ProfileFeatureAssetsOwner initialCommunities={initialCommunities} username={username} />
  }

  if (isPrivate) {
    return <ProfileUiPrivate />
  }

  return <ProfileFeatureAssetsViewer initialCommunities={initialCommunities} username={username} />
}
