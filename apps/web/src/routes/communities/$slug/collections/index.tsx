import { createFileRoute } from '@tanstack/react-router'

import { CommunityFeatureCollections } from '@/features/community/feature/community-feature-collections'
import { Route as CommunityRoute } from '@/routes/communities/$slug/route'

export const Route = createFileRoute('/communities/$slug/collections/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { community } = CommunityRoute.useRouteContext()

  if (!community) {
    return null
  }

  return <CommunityFeatureCollections initialCommunity={community} />
}
