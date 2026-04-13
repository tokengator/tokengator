import type { ProfileListCommunitiesByUsernameResult } from '@tokengator/sdk'
import { useProfileCommunitiesByUsernameQuery } from '@/features/profile/data-access/use-profile-communities-by-username-query.tsx'
import { ProfileUiCommunitiesCard } from '@/features/profile/ui/profile-ui-communities-card.tsx'

export function ProfileFeatureAssetsOwner({
  initialCommunities,
  username,
}: {
  initialCommunities: ProfileListCommunitiesByUsernameResult | null
  username: string
}) {
  const communities = useProfileCommunitiesByUsernameQuery(username, {
    initialData: initialCommunities,
  })

  if (communities.error) {
    return <div className="text-destructive text-sm">{communities.error.message}</div>
  }

  if (!communities.isPending && !communities.data) {
    return null
  }

  return (
    <div className="grid gap-6">
      <ProfileUiCommunitiesCard communities={communities.data?.communities ?? []} isPending={communities.isPending} />
    </div>
  )
}
