import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiInfoCard, UiInfoCardLabel, UiInfoCardValue } from '@tokengator/ui/components/ui-info-card'

import {
  type AdminCommunityDiscordSyncResult,
  useAdminCommunityDiscordSyncApply,
} from '../data-access/use-admin-community-discord-sync-apply'
import { useAdminCommunityDiscordSyncPreview } from '../data-access/use-admin-community-discord-sync-preview'

interface AdminCommunityFeatureDiscordSyncProps {
  onResultChange: (result: AdminCommunityDiscordSyncResult) => void
  organizationId: string
  result: AdminCommunityDiscordSyncResult | null
}

export function AdminCommunityFeatureDiscordSync(props: AdminCommunityFeatureDiscordSyncProps) {
  const { onResultChange, organizationId, result } = props
  const applyDiscordSync = useAdminCommunityDiscordSyncApply(organizationId)
  const previewDiscordSync = useAdminCommunityDiscordSyncPreview()
  const discordSyncActionRequiredCount = result
    ? result.summary.counts.discord_role_missing +
      result.summary.counts.linked_but_not_in_guild +
      result.summary.counts.mapping_missing +
      result.summary.counts.mapping_not_assignable +
      result.summary.counts.no_discord_account_linked
    : 0
  const discordSyncFailedCount = result && 'failedCount' in result.summary ? result.summary.failedCount : 0

  async function handleApplyDiscordSync() {
    try {
      const nextResult = await applyDiscordSync.mutateAsync({
        organizationId,
      })

      onResultChange(nextResult)
    } catch {}
  }

  async function handlePreviewDiscordSync() {
    try {
      const nextResult = await previewDiscordSync.mutateAsync({
        organizationId,
      })

      onResultChange(nextResult)
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Role Sync</CardTitle>
        <CardDescription>
          Preview and apply Discord role grants and revokes for linked users in the connected server.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={previewDiscordSync.isPending}
            onClick={() => void handlePreviewDiscordSync()}
            type="button"
            variant="outline"
          >
            {previewDiscordSync.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Preview Discord Roles
          </Button>
          <Button disabled={applyDiscordSync.isPending} onClick={() => void handleApplyDiscordSync()} type="button">
            {applyDiscordSync.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Apply Discord Reconcile
          </Button>
        </div>
        {result ? (
          <div className="grid gap-3 md:grid-cols-4">
            <UiInfoCard>
              <UiInfoCardLabel>Will Grant</UiInfoCardLabel>
              <UiInfoCardValue>{result.summary.counts.will_grant}</UiInfoCardValue>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Will Revoke</UiInfoCardLabel>
              <UiInfoCardValue>{result.summary.counts.will_revoke}</UiInfoCardValue>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Already Correct</UiInfoCardLabel>
              <UiInfoCardValue>{result.summary.counts.already_correct}</UiInfoCardValue>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Action Required</UiInfoCardLabel>
              <UiInfoCardValue>{discordSyncActionRequiredCount}</UiInfoCardValue>
              {'failedCount' in result.summary ? (
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <UiInfoCardLabel>Failed</UiInfoCardLabel>
                  <UiInfoCardValue>{discordSyncFailedCount}</UiInfoCardValue>
                </div>
              ) : null}
            </UiInfoCard>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Run a preview to inspect the next Discord role reconcile.</p>
        )}
      </CardContent>
    </Card>
  )
}
