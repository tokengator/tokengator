import type { AdminOrganizationDetailEntity } from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'
import { formatDateTime } from '@tokengator/ui/util/format-date-time'

import { formatOwnerSummary } from '@/features/admin-community/util/format-owner-summary.tsx'
import { useAdminCommunityGetQuery } from '../data-access/use-admin-community-get-query'

export function AdminCommunityFeatureOverview({
  initialOrganization,
}: {
  initialOrganization: AdminOrganizationDetailEntity
}) {
  const { data } = useAdminCommunityGetQuery(initialOrganization.id, {
    initialData: initialOrganization,
  })

  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Reference values for support and auditing.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <UiDetailRow label="Community ID:">{data.id}</UiDetailRow>
        <UiDetailRow label="Created:">{formatDateTime(data.createdAt)}</UiDetailRow>
        <UiDetailRow label="Members:">{data.members.length}</UiDetailRow>
        <UiDetailRow label="Owners:">
          {data.owners.length ? data.owners.map(formatOwnerSummary).join(', ') : 'No owners found'}
        </UiDetailRow>
        <UiDetailRow label="Logo:">{data.logo ?? 'No logo configured'}</UiDetailRow>
      </CardContent>
    </Card>
  )
}
