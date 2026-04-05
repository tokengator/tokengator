import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiInfoCard, UiInfoCardLabel, UiInfoCardMeta, UiInfoCardValue } from '@tokengator/ui/components/ui-info-card'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'

import { formatTimestamp } from '@/utils/admin-automation'
import { useAdminCommunityDiscordGuildRolesQuery } from '../data-access/use-admin-community-discord-guild-roles-query'
import { formatAdminCommunityDiscordCheck } from '../util/admin-community-discord-check'

function getDiscordConnectionTone(status: 'connected' | 'needs_attention'): UiStatusVariants['tone'] {
  if (status === 'needs_attention') {
    return 'warning'
  }

  return 'success'
}

interface AdminCommunityFeatureRoleMappingProps {
  organizationId: string
}

export function AdminCommunityFeatureRoleMapping(props: AdminCommunityFeatureRoleMappingProps) {
  const { organizationId } = props
  const discordGuildRoles = useAdminCommunityDiscordGuildRolesQuery(organizationId)
  const discordConnection = discordGuildRoles.data?.connection ?? null
  const errorMessage = discordGuildRoles.error?.message ?? null
  const isPending = discordGuildRoles.isPending
  const discordConnectionChecks = discordConnection?.diagnostics.checks ?? []
  const discordConnectionStatusTone = discordConnection ? getDiscordConnectionTone(discordConnection.status) : 'warning'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Role Mapping</CardTitle>
        <CardDescription>
          Map each TokenGator community role to one Discord role in this community&apos;s connected server.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading Discord role diagnostics...
          </div>
        ) : null}
        {errorMessage ? <div className="text-destructive text-sm">{errorMessage}</div> : null}
        {!isPending && !errorMessage && !discordConnection ? (
          <div className="grid gap-2 rounded-lg border p-3 text-sm">
            <div className="font-medium">No Discord server connected</div>
            <p className="text-muted-foreground">
              Connect a Discord server in{' '}
              <Link
                className="underline underline-offset-4"
                params={{ organizationId }}
                to="/admin/communities/$organizationId/settings"
              >
                Settings
              </Link>{' '}
              before mapping community roles.
            </p>
          </div>
        ) : null}
        {discordConnection ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
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
                  <UiInfoCardMeta>{formatTimestamp(discordConnection.lastCheckedAt)}</UiInfoCardMeta>
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
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
