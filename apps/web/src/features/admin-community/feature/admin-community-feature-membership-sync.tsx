import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import {
  type AdminCommunityMembershipSyncResult,
  useAdminCommunityMembershipSyncApply,
} from '../data-access/use-admin-community-membership-sync-apply'
import { useAdminCommunityMembershipSyncPreview } from '../data-access/use-admin-community-membership-sync-preview'

interface AdminCommunityFeatureMembershipSyncProps {
  onResultChange: (result: AdminCommunityMembershipSyncResult) => void
  organizationId: string
  result: AdminCommunityMembershipSyncResult | null
}

export function AdminCommunityFeatureMembershipSync(props: AdminCommunityFeatureMembershipSyncProps) {
  const { onResultChange, organizationId, result } = props
  const applyMembershipSync = useAdminCommunityMembershipSyncApply(organizationId)
  const previewMembershipSync = useAdminCommunityMembershipSyncPreview()

  async function handleApplyMembershipSync() {
    try {
      const nextResult = await applyMembershipSync.mutateAsync({
        organizationId,
      })

      onResultChange(nextResult)
    } catch {}
  }

  async function handlePreviewMembershipSync() {
    try {
      const nextResult = await previewMembershipSync.mutateAsync({
        organizationId,
      })

      onResultChange(nextResult)
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal Membership Sync</CardTitle>
        <CardDescription>
          Preview and apply the current token-gated organization and team membership changes inside TokenGator.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={previewMembershipSync.isPending}
            onClick={() => void handlePreviewMembershipSync()}
            type="button"
            variant="outline"
          >
            {previewMembershipSync.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Preview Membership
          </Button>
          <Button
            disabled={applyMembershipSync.isPending}
            onClick={() => void handleApplyMembershipSync()}
            type="button"
          >
            {applyMembershipSync.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Apply Membership
          </Button>
        </div>
        {result ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-muted-foreground">Organization Changes</div>
              <div>Add: {result.summary.addToOrganizationCount}</div>
              <div>Remove: {result.summary.removeFromOrganizationCount}</div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-muted-foreground">Team Changes</div>
              <div>Add: {result.summary.addToTeamCount}</div>
              <div>Remove: {result.summary.removeFromTeamCount}</div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-muted-foreground">Users</div>
              <div>Qualified: {result.summary.qualifiedUserCount}</div>
              <div>Changed: {result.summary.usersChangedCount}</div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Run a preview to inspect the next membership diff.</p>
        )}
      </CardContent>
    </Card>
  )
}
