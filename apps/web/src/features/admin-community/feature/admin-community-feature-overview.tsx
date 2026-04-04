import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'
import { formatDateTime } from '@tokengator/ui/util/format-date-time.ts'

import { formatOwnerSummary } from '@/features/admin-community/util/format-owner-summary.tsx'
import { useAdminCommunityGetQuery } from '../data-access/use-admin-community-get-query'

interface AdminCommunityFeatureOverviewProps {
  organizationId: string
}

export function AdminCommunityFeatureOverview(props: AdminCommunityFeatureOverviewProps) {
  const { organizationId } = props
  const organization = useAdminCommunityGetQuery(organizationId)

  if (!organization.data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Reference values for support and auditing.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <UiDetailRow label="Community ID:">{organization.data.id}</UiDetailRow>
        <UiDetailRow label="Created:">{formatDateTime(organization.data.createdAt)}</UiDetailRow>
        <UiDetailRow label="Members:">{organization.data.members.length}</UiDetailRow>
        <UiDetailRow label="Owners:">
          {organization.data.owners.length
            ? organization.data.owners.map(formatOwnerSummary).join(', ')
            : 'No owners found'}
        </UiDetailRow>
        <UiDetailRow label="Logo:">{organization.data.logo ?? 'No logo configured'}</UiDetailRow>
      </CardContent>
    </Card>
  )
}
