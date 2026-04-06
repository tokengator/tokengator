import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { ProfileFeatureShell } from '@/features/profile/feature/profile-feature-shell'

export const Route = createFileRoute('/profile')({
  beforeLoad: async ({ context }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    return { session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <ProfileFeatureShell>
      <Outlet />
    </ProfileFeatureShell>
  )
}
