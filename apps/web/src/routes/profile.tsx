import { createFileRoute, redirect } from '@tanstack/react-router'

import { getOrganizationListMine } from '@/features/organization/data-access/get-organization-list-mine'
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

    const organizationListMine = (await getOrganizationListMine()) ?? {
      organizations: [],
    }

    return { organizationListMine, session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { organizationListMine, session } = Route.useRouteContext()

  return <ProfileFeatureIndex initialOrganizationListMine={organizationListMine} session={session} />
}
