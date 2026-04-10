import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import type { AdminOrganizationDetailEntity } from '@tokengator/sdk'
import { Button } from '@tokengator/ui/components/button'
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'
import { formatDateTime } from '@tokengator/ui/util/format-date-time'

type AdminCommunityDiscordConnection = NonNullable<AdminOrganizationDetailEntity['discordConnection']>

function getDiscordConnectionStatusTone(status: AdminCommunityDiscordConnection['status']): UiStatusVariants['tone'] {
  return status === 'connected' ? 'success' : 'warning'
}

interface AdminCommunityDiscordConnectionUiDetailsProps {
  diagnostics: string[] | undefined
  disconnectAction: ReactNode
  discordConnection: AdminCommunityDiscordConnection
  isRefreshPending: boolean
  onInvite: () => void
  onRefresh: () => void
}

export function AdminCommunityDiscordConnectionUiDetails(props: AdminCommunityDiscordConnectionUiDetailsProps) {
  const { diagnostics, disconnectAction, discordConnection, isRefreshPending, onInvite, onRefresh } = props

  return (
    <>
      <div className="grid gap-2 text-sm">
        <UiDetailRow label="Server ID:">{discordConnection.guildId}</UiDetailRow>
        <UiDetailRow label="Server Name:">{discordConnection.guildName ?? 'Unknown'}</UiDetailRow>
        <UiDetailRow align="center" label="Status:">
          <UiStatus tone={getDiscordConnectionStatusTone(discordConnection.status)}>
            {discordConnection.status === 'connected' ? 'Connected' : 'Needs attention'}
          </UiStatus>
        </UiDetailRow>
        <UiDetailRow label="Last checked:">{formatDateTime(discordConnection.lastCheckedAt)}</UiDetailRow>
        <UiDetailRow label="Manage Roles:">
          {discordConnection.diagnostics == null
            ? 'Unavailable'
            : discordConnection.diagnostics.permissions.manageRoles
              ? 'Granted'
              : 'Missing'}
        </UiDetailRow>
        <UiDetailRow label="Commands:">
          {discordConnection.diagnostics == null
            ? 'Unavailable'
            : discordConnection.diagnostics.commands.registered
              ? 'Registered'
              : 'Not registered'}
        </UiDetailRow>
        {discordConnection.diagnostics?.commands.errorMessage ? (
          <UiDetailRow label="Command error:">{discordConnection.diagnostics.commands.errorMessage}</UiDetailRow>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onInvite} type="button" variant="outline">
          Invite Bot
        </Button>
        <Button disabled={isRefreshPending} onClick={onRefresh} type="button" variant="outline">
          {isRefreshPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Refreshing
            </>
          ) : (
            'Refresh Check'
          )}
        </Button>
        {disconnectAction}
      </div>
      <div className="grid gap-2 rounded-lg border p-3">
        <div className="text-sm font-medium">Diagnostics</div>
        {diagnostics === undefined ? (
          <p className="text-muted-foreground text-sm">No diagnostics are available yet.</p>
        ) : diagnostics.length ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {diagnostics.map((diagnostic) => (
              <li key={diagnostic}>{diagnostic}</li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground text-sm">
            Ready. Bot membership, permissions, and command registration passed.
          </p>
        )}
      </div>
    </>
  )
}
