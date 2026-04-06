import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiInfoCard, UiInfoCardLabel, UiInfoCardMeta, UiInfoCardValue } from '@tokengator/ui/components/ui-info-card'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'
import { formatDateTime } from '@tokengator/ui/util/format-date-time'

import { getFreshnessTone } from '@/features/admin-shared/util/get-freshness-tone'
import type {
  AdminCommunityDiscordSyncRunsResult,
  AdminCommunitySyncRunStatus,
} from '../data-access/admin-community-role-types'
import { useAdminCommunityDiscordGuildRolesQuery } from '../data-access/use-admin-community-discord-guild-roles-query'
import { useAdminCommunityDiscordRunsQuery } from '../data-access/use-admin-community-discord-runs-query'
import { useAdminCommunitySyncStatusQuery } from '../data-access/use-admin-community-sync-status-query'
import { formatAdminCommunityDiscordCheck } from '../util/admin-community-discord-check'

function getDiscordConnectionTone(status: 'connected' | 'needs_attention'): UiStatusVariants['tone'] {
  if (status === 'needs_attention') {
    return 'warning'
  }

  return 'success'
}

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

interface AdminCommunityFeatureDiscordHealthProps {
  organizationId: string
}

export function AdminCommunityFeatureDiscordHealth(props: AdminCommunityFeatureDiscordHealthProps) {
  const { organizationId } = props
  const discordGuildRoles = useAdminCommunityDiscordGuildRolesQuery(organizationId)
  const communityDiscordRuns = useAdminCommunityDiscordRunsQuery(organizationId)
  const communitySyncStatus = useAdminCommunitySyncStatusQuery(organizationId)
  const discordConnection = discordGuildRoles.data?.connection ?? null
  const discordStatus = communitySyncStatus.data?.discordStatus ?? null
  const hasDiscordGuildRolesError = Boolean(discordGuildRoles.error)
  const isPending = discordGuildRoles.isPending
  const discordConnectionChecks = discordConnection?.diagnostics.checks ?? []
  const discordConnectionStatusTone = discordConnection ? getDiscordConnectionTone(discordConnection.status) : 'warning'
  const recentDiscordRuns = (communityDiscordRuns.data?.runs ?? []) as AdminCommunityDiscordSyncRunsResult['runs']
  const hasDiscordRunsError = Boolean(communityDiscordRuns.error)
  const hasDiscordSyncStatusError = Boolean(communitySyncStatus.error)
  const discordFreshnessStatus = discordStatus?.freshnessStatus ?? 'unknown'
  const discordLastRunStatus = discordStatus ? (discordStatus.lastRun?.status ?? 'Never') : 'Unknown'
  const discordLastStartedAt = discordStatus ? formatDateTime(discordStatus.lastRun?.startedAt ?? null) : 'Unknown'
  const discordLastSuccessAt = discordStatus
    ? formatDateTime(discordStatus.lastSuccessfulRun?.finishedAt ?? null)
    : 'Unknown'
  const discordStaleAfter = discordStatus ? `${discordStatus.staleAfterMinutes} minutes` : 'Unknown'
  const discordState = discordStatus ? (discordStatus.isRunning ? 'running' : 'idle') : 'Unknown'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Health</CardTitle>
        <CardDescription>Connection diagnostics, reconcile freshness, and recent Discord run status.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading Discord health...
          </div>
        ) : null}
        {hasDiscordGuildRolesError ? (
          <div className="text-destructive text-sm">Failed to load Discord connection diagnostics.</div>
        ) : null}
        {hasDiscordSyncStatusError ? (
          <div className="text-destructive text-sm">Failed to load Discord sync status.</div>
        ) : null}
        {hasDiscordRunsError ? (
          <div className="text-destructive text-sm">Failed to load recent Discord runs.</div>
        ) : null}
        {!isPending && !hasDiscordGuildRolesError && !discordConnection ? (
          <div className="grid gap-2 rounded-lg border p-3 text-sm">
            <div className="font-medium">No Discord server connected.</div>
            <p className="text-muted-foreground">Connect a Discord server before running Discord reconcile.</p>
          </div>
        ) : null}
        {discordConnection ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <UiInfoCard>
                <UiInfoCardLabel>Discord Server</UiInfoCardLabel>
                <UiInfoCardValue>{discordConnection.guildName ?? 'Unknown'}</UiInfoCardValue>
                <UiInfoCardMeta>{discordConnection.guildId}</UiInfoCardMeta>
              </UiInfoCard>
              <UiInfoCard>
                <UiInfoCardLabel>Status</UiInfoCardLabel>
                <UiInfoCardValue className="mt-1">
                  <UiStatus tone={discordConnectionStatusTone}>
                    {discordConnection.status === 'connected' ? 'Connected' : 'Needs attention'}
                  </UiStatus>
                </UiInfoCardValue>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <UiInfoCardLabel>Last checked</UiInfoCardLabel>
                  <UiInfoCardMeta>{formatDateTime(discordConnection.lastCheckedAt)}</UiInfoCardMeta>
                </div>
              </UiInfoCard>
              <UiInfoCard>
                <UiInfoCardLabel>Bot Role Readiness</UiInfoCardLabel>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <UiInfoCardLabel>Manage Roles</UiInfoCardLabel>
                  <UiInfoCardValue>
                    {discordConnection.diagnostics.permissions.manageRoles ? 'Granted' : 'Missing'}
                  </UiInfoCardValue>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <UiInfoCardLabel>Highest role</UiInfoCardLabel>
                  <UiInfoCardValue>
                    {discordConnection.diagnostics.botHighestRole
                      ? `${discordConnection.diagnostics.botHighestRole.name ?? 'Unknown'} (#${discordConnection.diagnostics.botHighestRole.position})`
                      : 'Unknown'}
                  </UiInfoCardValue>
                </div>
              </UiInfoCard>
              <UiInfoCard className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <UiInfoCardLabel className="text-foreground font-medium">Reconcile Freshness</UiInfoCardLabel>
                  <UiStatus tone={getFreshnessTone(discordFreshnessStatus)}>{discordFreshnessStatus}</UiStatus>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <UiInfoCardLabel>Last success</UiInfoCardLabel>
                  <UiInfoCardValue>{discordLastSuccessAt}</UiInfoCardValue>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <UiInfoCardLabel>Last run</UiInfoCardLabel>
                  <UiInfoCardValue>{discordLastRunStatus}</UiInfoCardValue>
                </div>
                <UiInfoCardMeta>{discordLastStartedAt}</UiInfoCardMeta>
                <div className="flex items-baseline justify-between gap-3">
                  <UiInfoCardLabel>State</UiInfoCardLabel>
                  <UiInfoCardValue>{discordState}</UiInfoCardValue>
                </div>
                <UiInfoCardMeta>Stale after {discordStaleAfter}</UiInfoCardMeta>
              </UiInfoCard>
            </div>
            <div className="grid gap-2 rounded-lg border p-3">
              <div className="text-sm font-medium">Diagnostics</div>
              {discordConnectionChecks.length ? (
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {discordConnectionChecks.map((check) => (
                    <li key={check}>{formatAdminCommunityDiscordCheck(check)}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">Ready. Discord roles can be listed for this server.</p>
              )}
            </div>
            <div className="grid gap-2 rounded-lg border p-3 text-sm">
              <div className="font-medium">Recent Discord Runs</div>
              {communityDiscordRuns.isPending ? (
                <p className="text-muted-foreground text-sm">Loading Discord runs...</p>
              ) : !recentDiscordRuns.length ? (
                <p className="text-muted-foreground text-sm">No Discord runs yet.</p>
              ) : (
                recentDiscordRuns.map((run) => (
                  <div className="rounded-lg border p-3" key={run.id}>
                    <div className="flex items-center justify-between gap-2">
                      <UiStatus tone={getSyncRunTone(run.status)}>{run.status}</UiStatus>
                      <span className="text-muted-foreground text-xs">{run.triggerSource}</span>
                    </div>
                    <div className="mt-2">Started: {formatDateTime(run.startedAt)}</div>
                    <div className="text-muted-foreground">Finished: {formatDateTime(run.finishedAt)}</div>
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
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
