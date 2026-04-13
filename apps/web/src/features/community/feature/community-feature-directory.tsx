import type { CommunityListResult } from '@tokengator/sdk'

import { useCommunityListQuery } from '../data-access/use-community-list-query'
import { CommunityUiGridItem } from '../ui/community-ui-grid-item'

export function CommunityFeatureDirectory({ initialCommunities }: { initialCommunities: CommunityListResult }) {
  const communities = useCommunityListQuery({
    initialData: initialCommunities,
  })
  const communityItems = communities.data?.communities ?? []

  if (communities.error) {
    return <div className="text-destructive text-sm">Unable to load communities right now.</div>
  }

  return (
    <div className="min-h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <div className="space-y-1">
          <h1 className="text-xl font-medium">Communities</h1>
          <p className="text-muted-foreground text-sm">Browse all communities available inside TokenGator.</p>
        </div>
        {communities.isPending ? <p className="text-muted-foreground text-sm">Loading communities...</p> : null}
        {!communities.isPending && !communityItems.length ? (
          <p className="text-muted-foreground text-sm">No communities available.</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {communityItems.map((community) => (
            <CommunityUiGridItem community={community} key={community.id} />
          ))}
        </div>
      </div>
    </div>
  )
}
