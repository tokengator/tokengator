import type { CommunityGetBySlugResult } from '@tokengator/sdk'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'

import { useCommunityBySlugQuery } from '../data-access/use-community-by-slug-query'

export function CommunityFeatureOverview({ initialCommunity }: { initialCommunity: CommunityGetBySlugResult }) {
  const { data } = useCommunityBySlugQuery(initialCommunity.slug, {
    initialData: initialCommunity,
  })

  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Summary details for this community.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <UiDetailRow label="Name:">{data.name}</UiDetailRow>
        <UiDetailRow label="Slug:">@{data.slug}</UiDetailRow>
        <UiDetailRow label="Collections:">{data.collections.length}</UiDetailRow>
        <UiDetailRow label="Logo:">{data.logo ?? 'No logo configured'}</UiDetailRow>
      </CardContent>
    </Card>
  )
}
