import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'

export const Route = createFileRoute('/profile/identities')({
  beforeLoad: async ({ context }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    if (!session.user.username) {
      throw redirect({
        to: '/onboard',
      })
    }

    throw redirect({
      params: {
        username: session.user.username,
      },
      to: '/profile/$username/identities',
    })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return null
}
