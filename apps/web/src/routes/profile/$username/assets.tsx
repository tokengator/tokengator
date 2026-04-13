import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions, isOwner } from '@/features/auth/data-access/get-app-auth-state'
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

    if (!profile || (profile.private && !isOwner(session, params.username))) {
      return {
        profileCommunities: null,
      }
    }

    const profileCommunities = await context.queryClient.ensureQueryData(
      getProfileCommunitiesByUsernameRouteQueryOptions(params.username),
    )

    return {
      profileCommunities,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { profileCommunities } = Route.useRouteContext()
  const { isOwner, profile } = ProfileUsernameRoute.useRouteContext()
  const { username } = Route.useParams()

  return (
    <ProfileFeatureAssets
      initialCommunities={profileCommunities}
      isOwner={isOwner}
      isPrivate={Boolean(profile?.private) && !isOwner}
      username={username}
    />
  )
}
