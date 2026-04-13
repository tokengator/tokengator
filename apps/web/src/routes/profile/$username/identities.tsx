import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions, isOwner } from '@/features/auth/data-access/get-app-auth-state'
import { getProfileByUsernameRouteQueryOptions } from '@/features/profile/data-access/use-profile-by-username-query'
import { getProfileIdentitiesByUsernameRouteQueryOptions } from '@/features/profile/data-access/use-profile-identities-by-username-query'
import { getProfileListIdentitiesRouteQueryOptions } from '@/features/profile/data-access/use-profile-list-identities'
import { getProfileListSolanaWalletsRouteQueryOptions } from '@/features/profile/data-access/use-profile-list-solana-wallets'
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

    if (!profile) {
      return {
        ownerIdentities: null,
        ownerSolanaWallets: null,
        profileIdentities: null,
      }
    }

    if (isOwner(session, params.username)) {
      const [ownerIdentities, ownerSolanaWallets] = await Promise.all([
        context.queryClient.ensureQueryData(getProfileListIdentitiesRouteQueryOptions(session.user.id)),
        context.queryClient.ensureQueryData(getProfileListSolanaWalletsRouteQueryOptions(session.user.id)),
      ])

      return {
        ownerIdentities,
        ownerSolanaWallets,
        profileIdentities: null,
      }
    }

    if (profile.private) {
      return {
        ownerIdentities: null,
        ownerSolanaWallets: null,
        profileIdentities: null,
      }
    }

    const profileIdentities = await context.queryClient.ensureQueryData(
      getProfileIdentitiesByUsernameRouteQueryOptions(params.username),
    )

    return {
      ownerIdentities: null,
      ownerSolanaWallets: null,
      profileIdentities,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { ownerIdentities, ownerSolanaWallets, profileIdentities } = Route.useRouteContext()
  const { isOwner, profile, session } = ProfileUsernameRoute.useRouteContext()
  const { username } = Route.useParams()

  return (
    <ProfileFeatureIdentities
      initialIdentities={profileIdentities}
      initialOwnerIdentities={ownerIdentities}
      initialOwnerSolanaWallets={ownerSolanaWallets}
      isOwner={isOwner}
      isPrivate={Boolean(profile?.private) && !isOwner}
      session={session}
      username={username}
    />
  )
}
