import { Outlet, createFileRoute } from '@tanstack/react-router'

import { getCommunityBySlugRouteQueryOptions } from '@/features/community/data-access/use-community-by-slug-query'
import { CommunityFeatureShell } from '@/features/community/feature/community-feature-shell'

export const Route = createFileRoute('/communities/$slug')({
  beforeLoad: async ({ context, params }) => {
    const community = await context.queryClient.ensureQueryData(getCommunityBySlugRouteQueryOptions(params.slug))

    return { community }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { community } = Route.useRouteContext()

  return (
    <CommunityFeatureShell initialCommunity={community}>
      <Outlet />
    </CommunityFeatureShell>
  )
}
