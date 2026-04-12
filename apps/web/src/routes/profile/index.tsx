import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { getProfileIndexRedirect } from '@/features/profile/util/profile-route-access'

export const Route = createFileRoute('/profile/')({
  beforeLoad: async ({ context }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    throw redirect(getProfileIndexRedirect(session))
  },
  component: RouteComponent,
})

function RouteComponent() {
  return null
}
