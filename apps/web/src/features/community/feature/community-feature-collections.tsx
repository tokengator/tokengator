import type { CommunityGetBySlugResult } from '@tokengator/sdk'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Skeleton } from '@tokengator/ui/components/skeleton'

import { useCommunityBySlugQuery } from '../data-access/use-community-by-slug-query'

export function CommunityFeatureCollections({ initialCommunity }: { initialCommunity: CommunityGetBySlugResult }) {
  const { data } = useCommunityBySlugQuery(initialCommunity.slug, {
    initialData: initialCommunity,
  })

  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections</CardTitle>
        <CardDescription>Collections currently used by this community’s gating rules.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        {data.collections.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.collections.map((collection) => (
              <div className="bg-card overflow-hidden rounded-lg border" key={collection.id}>
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="grid gap-2 p-4">
                  <div className="font-medium">{collection.label}</div>
                  <div className="text-muted-foreground capitalize">{collection.type}</div>
                  <div className="text-muted-foreground font-mono text-xs break-all">{collection.address}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No collections are linked to this community yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
