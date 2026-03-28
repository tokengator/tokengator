import { createFileRoute, redirect } from '@tanstack/react-router'

import { ProfileFeatureIndex } from '@/features/profile/feature/profile-feature-index'
import { getUser } from '@/functions/get-user'

export const Route = createFileRoute('/profile')({
  beforeLoad: async () => {
    const session = await getUser()

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
  const { session } = Route.useRouteContext()

  return <ProfileFeatureIndex session={session} />
}
