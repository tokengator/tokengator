import { createFileRoute } from '@tanstack/react-router'

import { CommunityFeatureOverview } from '@/features/community/feature/community-feature-overview'
import { Route as CommunityRoute } from '@/routes/communities/$slug/route'

export const Route = createFileRoute('/communities/$slug/overview')({
  component: RouteComponent,
})

function RouteComponent() {
  const { community } = CommunityRoute.useRouteContext()

  if (!community) {
    return null
  }

  return <CommunityFeatureOverview initialCommunity={community} />
}
