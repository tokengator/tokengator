import { createFileRoute } from '@tanstack/react-router'

import { getCommunityListRouteQueryOptions } from '@/features/community/data-access/use-community-list-query'
import { CommunityFeatureDirectory } from '@/features/community/feature/community-feature-directory'

export const Route = createFileRoute('/communities/')({
  beforeLoad: async ({ context }) => {
    const communities = await context.queryClient.ensureQueryData(getCommunityListRouteQueryOptions())

    return { communities }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { communities } = Route.useRouteContext()

  return <CommunityFeatureDirectory initialCommunities={communities} />
}
