import { createFileRoute } from '@tanstack/react-router'

import { ProfileFeatureIdentities } from '@/features/profile/feature/profile-feature-identities'

export const Route = createFileRoute('/profile/identities')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ProfileFeatureIdentities />
}
