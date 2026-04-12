import type { OrganizationListMineResult, ProfileListCommunitiesByUsernameResult } from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { useOrganizationListMine } from '@/features/organization/data-access/use-organization-list-mine'
import { useProfileCommunitiesByUsernameQuery } from '@/features/profile/data-access/use-profile-communities-by-username-query'

import { useAppSession } from '@/features/auth/data-access/use-app-session'
import { ProfileUiCommunitiesCard } from '../ui/profile-ui-communities-card'

function ProfileFeatureAssetsOwner({
  initialOrganizationListMine,
}: {
  initialOrganizationListMine: OrganizationListMineResult
}) {
  const { data: session } = useAppSession()
  const communities = useOrganizationListMine(session?.user.id ?? '', {
    initialData: initialOrganizationListMine,
  })

  if (!session) {
    return null
  }

  return (
    <div className="grid gap-6">
      <ProfileUiCommunitiesCard communities={communities.data?.organizations ?? []} isPending={communities.isPending} />
    </div>
  )
}

function ProfileFeatureAssetsPrivate() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Private Profile</CardTitle>
        <CardDescription>This user exists, but their profile details are private.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Community memberships are only visible to the account owner.
      </CardContent>
    </Card>
  )
}

function ProfileFeatureAssetsViewer({
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
      <ProfileUiCommunitiesCard
        communities={communities.data?.communities ?? []}
        description="Communities this user belongs to in TokenGator."
        isPending={communities.isPending}
      />
    </div>
  )
}

export function ProfileFeatureAssets({
  initialCommunities,
  initialOrganizationListMine,
  isOwner,
  isPrivate,
  username,
}: {
  initialCommunities: ProfileListCommunitiesByUsernameResult | null
  initialOrganizationListMine: OrganizationListMineResult | null
  isOwner: boolean
  isPrivate: boolean
  username: string
}) {
  if (isOwner) {
    return (
      <ProfileFeatureAssetsOwner initialOrganizationListMine={initialOrganizationListMine ?? { organizations: [] }} />
    )
  }

  if (isPrivate) {
    return <ProfileFeatureAssetsPrivate />
  }

  return <ProfileFeatureAssetsViewer initialCommunities={initialCommunities} username={username} />
}
