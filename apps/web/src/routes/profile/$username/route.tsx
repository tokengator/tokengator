import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { getProfileByUsernameRouteQueryOptions } from '@/features/profile/data-access/use-profile-by-username-query'
import { ProfileFeatureShell } from '@/features/profile/feature/profile-feature-shell'

export const Route = createFileRoute('/profile/$username')({
  beforeLoad: async ({ context, params }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    const profile = await context.queryClient.ensureQueryData(getProfileByUsernameRouteQueryOptions(params.username))

    return {
      isAdmin: session.user.role === 'admin',
      isOwner: session.user.username === params.username,
      profile,
      session,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { isAdmin, isOwner, profile } = Route.useRouteContext()

  return (
    <ProfileFeatureShell isAdmin={isAdmin} isOwner={isOwner} user={profile}>
      <Outlet />
    </ProfileFeatureShell>
  )
}
