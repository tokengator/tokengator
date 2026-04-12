import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { ProfileFeatureSettings } from '@/features/profile/feature/profile-feature-settings'
import { canAccessProfileSettings } from '@/features/profile/util/profile-route-access'

export const Route = createFileRoute('/profile/$username/settings')({
  beforeLoad: async ({ context, params }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    if (!canAccessProfileSettings({ session, username: params.username })) {
      throw redirect({
        params: {
          username: params.username,
        },
        to: '/profile/$username',
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <ProfileFeatureSettings />
}
