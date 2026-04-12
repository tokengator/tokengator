import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { getOrganizationListMineQueryOptions } from '@/features/organization/data-access/get-organization-list-mine'
import { getProfileByUsernameRouteQueryOptions } from '@/features/profile/data-access/use-profile-by-username-query'
import { getProfileCommunitiesByUsernameRouteQueryOptions } from '@/features/profile/data-access/use-profile-communities-by-username-query'
import { ProfileFeatureAssets } from '@/features/profile/feature/profile-feature-assets'
import { Route as ProfileUsernameRoute } from '@/routes/profile/$username/route'

export const Route = createFileRoute('/profile/$username/assets')({
  beforeLoad: async ({ context, params }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    const profile = await context.queryClient.ensureQueryData(getProfileByUsernameRouteQueryOptions(params.username))

    if (session.user.username === params.username) {
      const organizationListMine = await context.queryClient.ensureQueryData(
        getOrganizationListMineQueryOptions(session.user.id),
      )

      return {
        organizationListMine,
        profileCommunities: null,
      }
    }

    if (!profile || profile.private) {
      return {
        organizationListMine: null,
        profileCommunities: null,
      }
    }

    const profileCommunities = await context.queryClient.ensureQueryData(
      getProfileCommunitiesByUsernameRouteQueryOptions(params.username),
    )

    return {
      organizationListMine: null,
      profileCommunities,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { organizationListMine, profileCommunities } = Route.useRouteContext()
  const { isOwner, profile } = ProfileUsernameRoute.useRouteContext()
  const { username } = Route.useParams()

  return (
    <ProfileFeatureAssets
      initialCommunities={profileCommunities}
      initialOrganizationListMine={organizationListMine}
      isOwner={isOwner}
      isPrivate={Boolean(profile?.private) && !isOwner}
      username={username}
    />
  )
}
