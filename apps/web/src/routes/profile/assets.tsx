import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { getOrganizationListMineQueryOptions } from '@/features/organization/data-access/get-organization-list-mine'
import { ProfileFeatureAssets } from '@/features/profile/feature/profile-feature-assets'

export const Route = createFileRoute('/profile/assets')({
  beforeLoad: async ({ context }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    const organizationListMine = await context.queryClient.ensureQueryData(
      getOrganizationListMineQueryOptions(session.user.id),
    )

    return { organizationListMine }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { organizationListMine } = Route.useRouteContext()

  return <ProfileFeatureAssets initialOrganizationListMine={organizationListMine} />
}
