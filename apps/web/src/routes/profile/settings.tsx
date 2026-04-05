import { createFileRoute } from '@tanstack/react-router'

import { ProfileFeatureSettings } from '@/features/profile/feature/profile-feature-settings'

export const Route = createFileRoute('/profile/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ProfileFeatureSettings />
}
