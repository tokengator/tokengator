import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import {
  UiInfoCard,
  UiInfoCardError,
  UiInfoCardLabel,
  UiInfoCardMeta,
  UiInfoCardValue,
} from '@tokengator/ui/components/ui-info-card'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'

import { formatTimestamp, getFreshnessTone } from '@/utils/admin-automation'
import type {
  AdminCommunityDiscordSyncRunsResult,
  AdminCommunityMembershipSyncRunsResult,
  AdminCommunitySyncRunStatus,
} from '../data-access/admin-community-role-types'
import { useAdminCommunityDiscordRunsQuery } from '../data-access/use-admin-community-discord-runs-query'
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

interface AdminCommunityFeatureAutomationHealthProps {
  organizationId: string
}

export function AdminCommunityFeatureAutomationHealth(props: AdminCommunityFeatureAutomationHealthProps) {
  const { organizationId } = props
  const communityDiscordRuns = useAdminCommunityDiscordRunsQuery(organizationId)
  const communityMembershipRuns = useAdminCommunityMembershipRunsQuery(organizationId)
  const communitySyncStatus = useAdminCommunitySyncStatusQuery(organizationId)
  const dependencyAssetGroups = communitySyncStatus.data?.dependencyAssetGroups ?? []
  const discordStatus = communitySyncStatus.data?.discordStatus ?? null
  const membershipStatus = communitySyncStatus.data?.membershipStatus ?? null
  const recentDiscordRuns = (communityDiscordRuns.data?.runs ?? []) as AdminCommunityDiscordSyncRunsResult['runs']
  const recentMembershipRuns = (communityMembershipRuns.data?.runs ??
    []) as AdminCommunityMembershipSyncRunsResult['runs']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation Health</CardTitle>
        <CardDescription>
          Scheduled freshness, dependency status, and recent failures for membership and Discord reconcile.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {communitySyncStatus.error ? (
          <div className="text-destructive text-sm">{communitySyncStatus.error.message}</div>
        ) : null}
        {communityMembershipRuns.error ? (
          <div className="text-destructive text-sm">{communityMembershipRuns.error.message}</div>
        ) : null}
        {communityDiscordRuns.error ? (
          <div className="text-destructive text-sm">{communityDiscordRuns.error.message}</div>
        ) : null}
        {communitySyncStatus.isPending ? (
          <div className="text-muted-foreground text-sm">Loading sync health...</div>
        ) : null}

        {membershipStatus && discordStatus ? (
          <div className="grid gap-3 md:grid-cols-2">
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
                  {formatTimestamp(membershipStatus.lastSuccessfulRun?.finishedAt ?? null)}
                </UiInfoCardValue>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <UiInfoCardLabel>Last run</UiInfoCardLabel>
                <UiInfoCardValue>{membershipStatus.lastRun?.status ?? 'Never'}</UiInfoCardValue>
              </div>
              <UiInfoCardMeta>{formatTimestamp(membershipStatus.lastRun?.startedAt ?? null)}</UiInfoCardMeta>
              <div className="flex items-baseline justify-between gap-3">
                <UiInfoCardLabel>State</UiInfoCardLabel>
                <UiInfoCardValue>{membershipStatus.isRunning ? 'running' : 'idle'}</UiInfoCardValue>
              </div>
              <UiInfoCardMeta>Stale after {membershipStatus.staleAfterMinutes} minutes</UiInfoCardMeta>
              {membershipStatus.lastRun?.errorMessage ? (
                <UiInfoCardError>{membershipStatus.lastRun.errorMessage}</UiInfoCardError>
              ) : null}
            </UiInfoCard>
            <UiInfoCard className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <UiInfoCardLabel className="text-foreground font-medium">Discord</UiInfoCardLabel>
                <UiStatus tone={getFreshnessTone(discordStatus.freshnessStatus)}>
                  {discordStatus.freshnessStatus}
                </UiStatus>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <UiInfoCardLabel>Last success</UiInfoCardLabel>
                <UiInfoCardValue>
                  {formatTimestamp(discordStatus.lastSuccessfulRun?.finishedAt ?? null)}
                </UiInfoCardValue>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <UiInfoCardLabel>Last run</UiInfoCardLabel>
                <UiInfoCardValue>{discordStatus.lastRun?.status ?? 'Never'}</UiInfoCardValue>
              </div>
              <UiInfoCardMeta>{formatTimestamp(discordStatus.lastRun?.startedAt ?? null)}</UiInfoCardMeta>
              <div className="flex items-baseline justify-between gap-3">
                <UiInfoCardLabel>State</UiInfoCardLabel>
                <UiInfoCardValue>{discordStatus.isRunning ? 'running' : 'idle'}</UiInfoCardValue>
              </div>
              <UiInfoCardMeta>Stale after {discordStatus.staleAfterMinutes} minutes</UiInfoCardMeta>
              {discordStatus.lastRun?.errorMessage ? (
                <UiInfoCardError>{discordStatus.lastRun.errorMessage}</UiInfoCardError>
              ) : null}
            </UiInfoCard>
          </div>
        ) : null}

        <div className="grid gap-2 rounded-lg border p-3 text-sm">
          <div className="font-medium">Dependency Asset Groups</div>
          {!dependencyAssetGroups.length ? (
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
                    Last success: {formatTimestamp(assetGroup.indexingStatus.lastSuccessfulRun?.finishedAt ?? null)}
                  </div>
                  {!assetGroup.enabled ? (
                    <div className="text-muted-foreground text-xs">Disabled asset group</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2 rounded-lg border p-3 text-sm">
            <div className="font-medium">Recent Membership Runs</div>
            {!recentMembershipRuns.length ? (
              <p className="text-muted-foreground text-sm">No membership runs yet.</p>
            ) : (
              recentMembershipRuns.map((run) => (
                <div className="rounded-lg border p-3" key={run.id}>
                  <div className="flex items-center justify-between gap-2">
                    <UiStatus tone={getSyncRunTone(run.status)}>{run.status}</UiStatus>
                    <span className="text-muted-foreground text-xs">{run.triggerSource}</span>
                  </div>
                  <div className="mt-2">Started: {formatTimestamp(run.startedAt)}</div>
                  <div className="text-muted-foreground">Finished: {formatTimestamp(run.finishedAt)}</div>
                  <div className="text-muted-foreground">{`Qualified ${run.qualifiedUserCount} · Changed ${run.usersChangedCount}`}</div>
                  <div className="text-muted-foreground">
                    {`Org +${run.addToOrganizationCount} / -${run.removeFromOrganizationCount} · Teams +${run.addToTeamCount} / -${run.removeFromTeamCount}`}
                  </div>
                  {run.errorMessage ? <div className="text-destructive mt-2 text-xs">{run.errorMessage}</div> : null}
                </div>
              ))
            )}
          </div>
          <div className="grid gap-2 rounded-lg border p-3 text-sm">
            <div className="font-medium">Recent Discord Runs</div>
            {!recentDiscordRuns.length ? (
              <p className="text-muted-foreground text-sm">No Discord runs yet.</p>
            ) : (
              recentDiscordRuns.map((run) => (
                <div className="rounded-lg border p-3" key={run.id}>
                  <div className="flex items-center justify-between gap-2">
                    <UiStatus tone={getSyncRunTone(run.status)}>{run.status}</UiStatus>
                    <span className="text-muted-foreground text-xs">{run.triggerSource}</span>
                  </div>
                  <div className="mt-2">Started: {formatTimestamp(run.startedAt)}</div>
                  <div className="text-muted-foreground">Finished: {formatTimestamp(run.finishedAt)}</div>
                  {'appliedGrantCount' in run ? (
                    <>
                      <div className="text-muted-foreground">
                        {`Grants ${run.appliedGrantCount} · Revokes ${run.appliedRevokeCount} · Failed ${run.failedCount}`}
                      </div>
                      <div className="text-muted-foreground">
                        {`Roles ready ${run.rolesReadyCount} · blocked ${run.rolesBlockedCount} · users changed ${run.usersChangedCount}`}
                      </div>
                    </>
                  ) : null}
                  {run.errorMessage ? <div className="text-destructive mt-2 text-xs">{run.errorMessage}</div> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
