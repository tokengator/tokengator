import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'

import { formatTimestamp } from '@/utils/admin-automation'
import type {
  AdminCommunityDiscordGuildRoleRecord,
  AdminCommunityDiscordGuildRolesResult,
  AdminCommunityRoleRecord,
} from '../data-access/admin-community-role-types'
import type { AdminCommunityRoleMappingPresentation } from './admin-community-feature-role-catalog'
import { useAdminCommunityDiscordGuildRolesQuery } from '../data-access/use-admin-community-discord-guild-roles-query'
import { useAdminCommunityDiscordRoleMappingSet } from '../data-access/use-admin-community-discord-role-mapping-set'
import { AdminCommunityRoleUiMappingCard } from '../ui/admin-community-role-ui-mapping-card'
import { formatAdminCommunityDiscordCheck } from '../util/admin-community-discord-check'

function getDiscordMappingState(input: {
  discordGuildRoles?: AdminCommunityDiscordGuildRolesResult
  discordGuildRolesError: boolean
  role: AdminCommunityRoleRecord
}) {
  if (!input.role.discordRoleId) {
    return {
      checks: [] as string[],
      guildRole: null as AdminCommunityDiscordGuildRoleRecord | null,
      status: 'not_mapped' as const,
    }
  }

  if (input.discordGuildRolesError) {
    return {
      checks: ['discord_validation_unavailable'],
      guildRole: null,
      status: 'needs_attention' as const,
    }
  }

  if (!input.discordGuildRoles?.connection) {
    return {
      checks: ['discord_connection_missing'],
      guildRole: null,
      status: 'needs_attention' as const,
    }
  }

  const guildRole = input.discordGuildRoles.guildRoles.find(
    (currentGuildRole) => currentGuildRole.id === input.role.discordRoleId,
  )

  if (!guildRole) {
    return {
      checks: ['discord_role_not_found'],
      guildRole: null,
      status: 'needs_attention' as const,
    }
  }

  const checks = [
    ...new Set(
      [...input.discordGuildRoles.connection.diagnostics.checks, ...guildRole.checks].sort((left, right) =>
        left.localeCompare(right),
      ),
    ),
  ]

  return {
    checks,
    guildRole,
    status: guildRole.assignable && checks.length === 0 ? ('ready' as const) : ('needs_attention' as const),
  }
}

function getDiscordMappingTone(status: 'needs_attention' | 'not_mapped' | 'ready'): UiStatusVariants['tone'] {
  if (status === 'ready') {
    return 'success'
  }

  if (status === 'needs_attention') {
    return 'warning'
  }

  return 'default'
}

function normalizeDiscordRoleName(name: string) {
  return name.replaceAll(/\s+/g, ' ').trim().toLowerCase()
}

interface AdminCommunityFeatureRoleMappingProps {
  children: (args: {
    getRoleMappingPresentation: (communityRole: AdminCommunityRoleRecord) => AdminCommunityRoleMappingPresentation
  }) => ReactNode
  communityRoles: AdminCommunityRoleRecord[]
  onDiscordSyncResultReset: () => void
  organizationId: string
}

export function AdminCommunityFeatureRoleMapping(props: AdminCommunityFeatureRoleMappingProps) {
  const { children, communityRoles, onDiscordSyncResultReset, organizationId } = props
  const [discordRoleDrafts, setDiscordRoleDrafts] = useState<Record<string, string>>({})
  const discordGuildRoles = useAdminCommunityDiscordGuildRolesQuery(organizationId)
  const setDiscordRoleMapping = useAdminCommunityDiscordRoleMappingSet(organizationId)
  const discordConnection = discordGuildRoles.data?.connection ?? null
  const discordConnectionChecks = discordConnection?.diagnostics.checks ?? []
  const discordConnectionStatusTone: UiStatusVariants['tone'] =
    discordConnection?.status === 'connected' ? 'success' : 'warning'
  const discordGuildRolesById = new Map(
    (discordGuildRoles.data?.guildRoles ?? []).map((guildRole) => [guildRole.id, guildRole] as const),
  )
  const mappedCommunityRolesByDiscordRoleId = new Map(
    communityRoles
      .filter((communityRole) => communityRole.discordRoleId)
      .map((communityRole) => [communityRole.discordRoleId as string, communityRole] as const),
  )
  const canConfigureDiscordMappings =
    !discordGuildRoles.isPending &&
    !discordGuildRoles.error &&
    Boolean(discordConnection) &&
    (discordGuildRoles.data?.guildRoles.length ?? 0) > 0

  async function clearRoleMapping(communityRoleId: string) {
    try {
      await setDiscordRoleMapping.mutateAsync({
        communityRoleId,
        discordRoleId: null,
      })
      onDiscordSyncResultReset()
      setDiscordRoleDrafts((currentDrafts) => ({
        ...currentDrafts,
        [communityRoleId]: '',
      }))
    } catch {}
  }

  async function saveRoleMapping(communityRoleId: string, discordRoleId: string) {
    try {
      await setDiscordRoleMapping.mutateAsync({
        communityRoleId,
        discordRoleId,
      })
      onDiscordSyncResultReset()
      setDiscordRoleDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts }

        delete nextDrafts[communityRoleId]

        return nextDrafts
      })
    } catch {}
  }

  function getRoleMappingPresentation(communityRole: AdminCommunityRoleRecord): AdminCommunityRoleMappingPresentation {
    const currentDiscordMappingState = getDiscordMappingState({
      discordGuildRoles: discordGuildRoles.data,
      discordGuildRolesError: Boolean(discordGuildRoles.error),
      role: communityRole,
    })
    const hasDiscordRoleDraft = Object.prototype.hasOwnProperty.call(discordRoleDrafts, communityRole.id)
    const autoSelectedDiscordRoleMatches =
      hasDiscordRoleDraft || communityRole.discordRoleId
        ? []
        : (discordGuildRoles.data?.guildRoles ?? []).filter((guildRole) => {
            const mappedOwner = mappedCommunityRolesByDiscordRoleId.get(guildRole.id)

            if (guildRole.isDefault || guildRole.managed) {
              return false
            }

            if (mappedOwner && mappedOwner.id !== communityRole.id) {
              return false
            }

            return normalizeDiscordRoleName(guildRole.name) === normalizeDiscordRoleName(communityRole.name)
          })
    const autoSelectedDiscordRoleId =
      autoSelectedDiscordRoleMatches.length === 1 ? autoSelectedDiscordRoleMatches[0].id : ''
    const currentDiscordRoleDraft = hasDiscordRoleDraft
      ? (discordRoleDrafts[communityRole.id] ?? '')
      : (communityRole.discordRoleId ?? autoSelectedDiscordRoleId)
    const currentGuildRole = currentDiscordMappingState.guildRole
    const isDiscordRoleMappingDirty = currentDiscordRoleDraft !== (communityRole.discordRoleId ?? '')
    const isDiscordRoleMappingPending =
      setDiscordRoleMapping.isPending && setDiscordRoleMapping.variables?.communityRoleId === communityRole.id
    const mappedDiscordRole = communityRole.discordRoleId
      ? (discordGuildRolesById.get(communityRole.discordRoleId) ?? null)
      : null
    const mappedDiscordRoleMissing = Boolean(communityRole.discordRoleId) && !mappedDiscordRole
    const selectedDraftRoleOwner = currentDiscordRoleDraft
      ? (mappedCommunityRolesByDiscordRoleId.get(currentDiscordRoleDraft) ?? null)
      : null
    const mappingDiagnostics = currentDiscordMappingState.checks.map((check) =>
      formatAdminCommunityDiscordCheck(check, {
        botHighestRolePosition: discordGuildRoles.data?.connection?.diagnostics.botHighestRole?.position ?? null,
        guildRolePosition: currentGuildRole?.position ?? null,
      }),
    )

    return {
      discordMappingLabel: currentGuildRole
        ? `${currentGuildRole.name} (#${currentGuildRole.position})`
        : communityRole.discordRoleId
          ? `Missing role (${communityRole.discordRoleId})`
          : 'No Discord role selected',
      discordMappingStatusLabel:
        currentDiscordMappingState.status === 'ready'
          ? 'Ready'
          : currentDiscordMappingState.status === 'needs_attention'
            ? 'Needs attention'
            : 'Not mapped',
      discordMappingTone: getDiscordMappingTone(currentDiscordMappingState.status),
      mappingContent: (
        <AdminCommunityRoleUiMappingCard
          canClear={Boolean(communityRole.discordRoleId || currentDiscordRoleDraft)}
          canConfigureDiscordMappings={canConfigureDiscordMappings}
          canSave={Boolean(currentDiscordRoleDraft) && isDiscordRoleMappingDirty && canConfigureDiscordMappings}
          currentDiscordRoleDraft={currentDiscordRoleDraft}
          diagnostics={mappingDiagnostics}
          id={`community-role-discord-role-${communityRole.id}`}
          isPending={isDiscordRoleMappingPending}
          mappingConflictMessage={
            currentDiscordRoleDraft && selectedDraftRoleOwner && selectedDraftRoleOwner.id !== communityRole.id
              ? `This Discord role is already mapped to ${selectedDraftRoleOwner.name}.`
              : undefined
          }
          missingMappedRoleOption={
            mappedDiscordRoleMissing && communityRole.discordRoleId
              ? {
                  id: communityRole.discordRoleId,
                  label: `Missing Discord role (${communityRole.discordRoleId})`,
                }
              : undefined
          }
          onClear={() => void clearRoleMapping(communityRole.id)}
          onDraftChange={(value) =>
            setDiscordRoleDrafts((currentDrafts) => ({
              ...currentDrafts,
              [communityRole.id]: value,
            }))
          }
          onSave={() => void saveRoleMapping(communityRole.id, currentDiscordRoleDraft)}
          options={(discordGuildRoles.data?.guildRoles ?? [])
            .filter((guildRole) => !guildRole.isDefault)
            .map((guildRole) => {
              const mappedOwner = mappedCommunityRolesByDiscordRoleId.get(guildRole.id)
              const mappedElsewhere = mappedOwner ? mappedOwner.id !== communityRole.id : false

              return {
                disabled: guildRole.managed || mappedElsewhere,
                id: guildRole.id,
                label: `${guildRole.name} (#${guildRole.position})${
                  guildRole.managed
                    ? ' · managed'
                    : mappedElsewhere
                      ? ` · mapped to ${mappedOwner?.name ?? 'another role'}`
                      : ''
                }`,
              }
            })}
          showDisabledRoleNote={!communityRole.enabled}
          statusMessage={
            communityRole.discordRoleId
              ? 'This Discord role is ready for Discord reconcile.'
              : 'No Discord role selected yet.'
          }
        />
      ),
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Discord Role Mapping</CardTitle>
          <CardDescription>
            Map each TokenGator community role to one Discord role in this community&apos;s connected server.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {discordGuildRoles.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading Discord role diagnostics...
            </div>
          ) : null}
          {discordGuildRoles.error ? (
            <div className="text-destructive text-sm">{discordGuildRoles.error.message}</div>
          ) : null}
          {!discordGuildRoles.isPending && !discordGuildRoles.error && !discordConnection ? (
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
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-muted-foreground">Discord Server</div>
                  <div>{discordConnection.guildName ?? 'Unknown'}</div>
                  <div className="text-muted-foreground">{discordConnection.guildId}</div>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <UiStatus tone={discordConnectionStatusTone}>
                      {discordConnection.status === 'connected' ? 'Connected' : 'Needs attention'}
                    </UiStatus>
                  </div>
                  <div className="text-muted-foreground mt-2">
                    Last checked: {formatTimestamp(discordConnection.lastCheckedAt)}
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-muted-foreground">Bot Role Readiness</div>
                  <div>
                    Manage Roles: {discordConnection.diagnostics.permissions.manageRoles ? 'Granted' : 'Missing'}
                  </div>
                  <div>
                    Highest role:{' '}
                    {discordConnection.diagnostics.botHighestRole
                      ? `${discordConnection.diagnostics.botHighestRole.name ?? 'Unknown'} (#${discordConnection.diagnostics.botHighestRole.position})`
                      : 'Unknown'}
                  </div>
                </div>
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

      {children({ getRoleMappingPresentation })}
    </>
  )
}
