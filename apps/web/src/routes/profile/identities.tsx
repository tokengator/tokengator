import { createFileRoute } from '@tanstack/react-router'

import { ProfileFeatureIdentities } from '@/features/profile/feature/profile-feature-identities'
import { Route as ProfileRoute } from '@/routes/profile/route'

export const Route = createFileRoute('/profile/identities')({
  component: RouteComponent,
})

function RouteComponent() {
  const { session } = ProfileRoute.useRouteContext()

  return <ProfileFeatureIdentities session={session} />
}
