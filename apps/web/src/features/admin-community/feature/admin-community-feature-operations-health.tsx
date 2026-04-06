import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiInfoCard, UiInfoCardError, UiInfoCardLabel, UiInfoCardValue } from '@tokengator/ui/components/ui-info-card'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'
import { formatDateTime } from '@tokengator/ui/util/format-date-time'

import { getFreshnessTone } from '@/features/admin/util/get-freshness-tone'
import type {
  AdminCommunityMembershipSyncRunsResult,
  AdminCommunitySyncRunStatus,
} from '../data-access/admin-community-role-types'
import { useAdminCommunityMembershipRunsQuery } from '../data-access/use-admin-community-membership-runs-query'
import { useAdminCommunitySyncStatusQuery } from '../data-access/use-admin-community-sync-status-query'

function getSyncRunTone(status: AdminCommunitySyncRunStatus): UiStatusVariants['tone'] {
  if (status === 'succeeded') {
    return 'success'
  }

  if (status === 'partial') {
    return 'warning'
  }

  if (status === 'failed') {
    return 'destructive'
  }

  return 'default'
}

interface AdminCommunityFeatureOperationsHealthProps {
  organizationId: string
}

export function AdminCommunityFeatureOperationsHealth(props: AdminCommunityFeatureOperationsHealthProps) {
  const { organizationId } = props
  const communityMembershipRuns = useAdminCommunityMembershipRunsQuery(organizationId)
  const communitySyncStatus = useAdminCommunitySyncStatusQuery(organizationId)
  const dependencyAssetGroups = communitySyncStatus.data?.dependencyAssetGroups ?? []
  const membershipStatus = communitySyncStatus.data?.membershipStatus ?? null
  const recentMembershipRuns = (communityMembershipRuns.data?.runs ??
    []) as AdminCommunityMembershipSyncRunsResult['runs']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations Health</CardTitle>
        <CardDescription>
          Membership freshness, dependency status, and recent membership reconcile history.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {communitySyncStatus.error ? (
          <div className="text-destructive text-sm">{communitySyncStatus.error.message}</div>
        ) : null}
        {communityMembershipRuns.error ? (
          <div className="text-destructive text-sm">{communityMembershipRuns.error.message}</div>
        ) : null}
        {communitySyncStatus.isPending ? (
          <div className="text-muted-foreground text-sm">Loading sync health...</div>
        ) : null}

        {membershipStatus ? (
          <UiInfoCard className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <UiInfoCardLabel className="text-foreground font-medium">Membership</UiInfoCardLabel>
              <UiStatus tone={getFreshnessTone(membershipStatus.freshnessStatus)}>
                {membershipStatus.freshnessStatus}
              </UiStatus>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <UiInfoCardLabel>Last success</UiInfoCardLabel>
              <UiInfoCardValue>
                {formatDateTime(membershipStatus.lastSuccessfulRun?.finishedAt ?? null)}
              </UiInfoCardValue>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <UiInfoCardLabel>Last run</UiInfoCardLabel>
              <UiInfoCardValue>{membershipStatus.lastRun?.status ?? 'Never'}</UiInfoCardValue>
            </div>
            <div className="text-muted-foreground text-xs">
              {formatDateTime(membershipStatus.lastRun?.startedAt ?? null)}
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <UiInfoCardLabel>State</UiInfoCardLabel>
              <UiInfoCardValue>{membershipStatus.isRunning ? 'running' : 'idle'}</UiInfoCardValue>
            </div>
            <div className="text-muted-foreground text-xs">
              Stale after {membershipStatus.staleAfterMinutes} minutes
            </div>
            {membershipStatus.lastRun?.errorMessage ? (
              <UiInfoCardError>{membershipStatus.lastRun.errorMessage}</UiInfoCardError>
            ) : null}
          </UiInfoCard>
        ) : null}

        <div className="grid gap-2 rounded-lg border p-3 text-sm">
          <div className="font-medium">Dependency Asset Groups</div>
          {communitySyncStatus.isPending ? (
            <p className="text-muted-foreground text-sm">Loading dependency health...</p>
          ) : communitySyncStatus.error && !dependencyAssetGroups.length ? (
            <p className="text-muted-foreground text-sm">Dependency health unavailable.</p>
          ) : !dependencyAssetGroups.length ? (
            <p className="text-muted-foreground text-sm">No indexed asset-group dependencies yet.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {dependencyAssetGroups.map((assetGroup) => (
                <div className="rounded-lg border p-3" key={assetGroup.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{assetGroup.label}</div>
                    <UiStatus tone={getFreshnessTone(assetGroup.indexingStatus.freshnessStatus)}>
                      {assetGroup.indexingStatus.freshnessStatus}
                    </UiStatus>
                  </div>
                  <div className="text-muted-foreground">
                    {assetGroup.type} · {assetGroup.address}
                  </div>
                  <div className="text-muted-foreground">
                    Last success: {formatDateTime(assetGroup.indexingStatus.lastSuccessfulRun?.finishedAt ?? null)}
                  </div>
                  {!assetGroup.enabled ? (
                    <div className="text-muted-foreground text-xs">Disabled asset group</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-2 rounded-lg border p-3 text-sm">
          <div className="font-medium">Recent Membership Runs</div>
          {communityMembershipRuns.isPending ? (
            <p className="text-muted-foreground text-sm">Loading membership runs...</p>
          ) : communityMembershipRuns.error && !recentMembershipRuns.length ? (
            <p className="text-muted-foreground text-sm">Membership runs unavailable.</p>
          ) : !recentMembershipRuns.length ? (
            <p className="text-muted-foreground text-sm">No membership runs yet.</p>
          ) : (
            recentMembershipRuns.map((run) => (
              <div className="rounded-lg border p-3" key={run.id}>
                <div className="flex items-center justify-between gap-2">
                  <UiStatus tone={getSyncRunTone(run.status)}>{run.status}</UiStatus>
                  <span className="text-muted-foreground text-xs">{run.triggerSource}</span>
                </div>
                <div className="mt-2">Started: {formatDateTime(run.startedAt)}</div>
                <div className="text-muted-foreground">Finished: {formatDateTime(run.finishedAt)}</div>
                <div className="text-muted-foreground">{`Qualified ${run.qualifiedUserCount} · Changed ${run.usersChangedCount}`}</div>
                <div className="text-muted-foreground">
                  {`Org +${run.addToOrganizationCount} / -${run.removeFromOrganizationCount} · Teams +${run.addToTeamCount} / -${run.removeFromTeamCount}`}
                </div>
                {run.errorMessage ? <div className="text-destructive mt-2 text-xs">{run.errorMessage}</div> : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
