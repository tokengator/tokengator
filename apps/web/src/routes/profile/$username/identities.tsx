import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions, isOwner } from '@/features/auth/data-access/get-app-auth-state'
import { getProfileByUsernameRouteQueryOptions } from '@/features/profile/data-access/use-profile-by-username-query'
import { getProfileIdentitiesByUsernameRouteQueryOptions } from '@/features/profile/data-access/use-profile-identities-by-username-query'
import { ProfileFeatureIdentities } from '@/features/profile/feature/profile-feature-identities'
import { Route as ProfileUsernameRoute } from '@/routes/profile/$username/route'

export const Route = createFileRoute('/profile/$username/identities')({
  beforeLoad: async ({ context, params }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    const profile = await context.queryClient.ensureQueryData(getProfileByUsernameRouteQueryOptions(params.username))

    if (!profile || isOwner(session, params.username) || profile.private) {
      return {
        profileIdentities: null,
      }
    }

    const profileIdentities = await context.queryClient.ensureQueryData(
      getProfileIdentitiesByUsernameRouteQueryOptions(params.username),
    )

    return {
      profileIdentities,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { profileIdentities } = Route.useRouteContext()
  const { isOwner, profile, session } = ProfileUsernameRoute.useRouteContext()
  const { username } = Route.useParams()

  return (
    <ProfileFeatureIdentities
      initialIdentities={profileIdentities}
      isOwner={isOwner}
      isPrivate={Boolean(profile?.private) && !isOwner}
      session={session}
      username={username}
    />
  )
}
