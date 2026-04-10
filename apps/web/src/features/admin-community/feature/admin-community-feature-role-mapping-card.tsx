import { useState } from 'react'
import type { AdminCommunityRoleDiscordGuildRolesResult, AdminCommunityRoleEntity } from '@tokengator/sdk'
import type { UiStatusVariants } from '@tokengator/ui/components/ui-status'

import { useAdminCommunityDiscordRoleMappingSet } from '../data-access/use-admin-community-discord-role-mapping-set'
import { AdminCommunityRoleUiCard } from '../ui/admin-community-role-ui-card'
import { AdminCommunityRoleUiMappingCard } from '../ui/admin-community-role-ui-mapping-card'
import { formatAdminCommunityDiscordCheck } from '../util/admin-community-discord-check'

type AdminCommunityDiscordGuildRoleRecord = AdminCommunityRoleDiscordGuildRolesResult['guildRoles'][number]

function getDiscordMappingState(input: {
  discordGuildRoles?: AdminCommunityRoleDiscordGuildRolesResult
  discordGuildRolesError: boolean
  role: AdminCommunityRoleEntity
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

interface AdminCommunityFeatureRoleMappingCardProps {
  communityRole: AdminCommunityRoleEntity
  communityRoles: AdminCommunityRoleEntity[]
  discordGuildRoles?: AdminCommunityRoleDiscordGuildRolesResult
  hasDiscordGuildRolesError: boolean
  isDiscordGuildRolesPending: boolean
  onDelete: () => void
  onEdit: () => void
  organizationId: string
}

export function AdminCommunityFeatureRoleMappingCard(props: AdminCommunityFeatureRoleMappingCardProps) {
  const {
    communityRole,
    communityRoles,
    discordGuildRoles,
    hasDiscordGuildRolesError,
    isDiscordGuildRolesPending,
    onDelete,
    onEdit,
    organizationId,
  } = props
  const [discordRoleDraftOverride, setDiscordRoleDraftOverride] = useState<string | null>(null)
  const setDiscordRoleMapping = useAdminCommunityDiscordRoleMappingSet(organizationId)
  const discordConnection = discordGuildRoles?.connection ?? null
  const discordGuildRolesById = new Map(
    (discordGuildRoles?.guildRoles ?? []).map((guildRole) => [guildRole.id, guildRole] as const),
  )
  const mappedCommunityRolesByDiscordRoleId = new Map(
    communityRoles
      .filter((currentCommunityRole) => currentCommunityRole.discordRoleId)
      .map((currentCommunityRole) => [currentCommunityRole.discordRoleId as string, currentCommunityRole] as const),
  )
  const canConfigureDiscordMappings =
    !isDiscordGuildRolesPending &&
    !hasDiscordGuildRolesError &&
    Boolean(discordConnection) &&
    (discordGuildRoles?.guildRoles.length ?? 0) > 0
  const currentDiscordMappingState = getDiscordMappingState({
    discordGuildRoles,
    discordGuildRolesError: hasDiscordGuildRolesError,
    role: communityRole,
  })
  const hasDiscordRoleDraftOverride = discordRoleDraftOverride !== null
  const autoSelectedDiscordRoleMatches =
    hasDiscordRoleDraftOverride || communityRole.discordRoleId
      ? []
      : (discordGuildRoles?.guildRoles ?? []).filter((guildRole) => {
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
  const currentDiscordRoleDraft = hasDiscordRoleDraftOverride
    ? (discordRoleDraftOverride ?? '')
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
      botHighestRolePosition: discordGuildRoles?.connection?.diagnostics.botHighestRole?.position ?? null,
      guildRolePosition: currentGuildRole?.position ?? null,
    }),
  )

  async function handleClearRoleMapping() {
    try {
      await setDiscordRoleMapping.mutateAsync({
        communityRoleId: communityRole.id,
        discordRoleId: null,
      })
      setDiscordRoleDraftOverride('')
    } catch {}
  }

  async function handleSaveRoleMapping() {
    try {
      await setDiscordRoleMapping.mutateAsync({
        communityRoleId: communityRole.id,
        discordRoleId: currentDiscordRoleDraft,
      })
      setDiscordRoleDraftOverride(null)
    } catch {}
  }

  return (
    <AdminCommunityRoleUiCard
      conditions={communityRole.conditions}
      discordMappingLabel={
        currentGuildRole
          ? `${currentGuildRole.name} (#${currentGuildRole.position})`
          : communityRole.discordRoleId
            ? `Missing role (${communityRole.discordRoleId})`
            : 'No Discord role selected'
      }
      discordMappingStatusLabel={
        currentDiscordMappingState.status === 'ready'
          ? 'Ready'
          : currentDiscordMappingState.status === 'needs_attention'
            ? 'Needs attention'
            : 'Not mapped'
      }
      discordMappingTone={getDiscordMappingTone(currentDiscordMappingState.status)}
      enabled={communityRole.enabled}
      mappingContent={
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
          onClear={() => void handleClearRoleMapping()}
          onDraftChange={setDiscordRoleDraftOverride}
          onSave={() => void handleSaveRoleMapping()}
          options={(discordGuildRoles?.guildRoles ?? [])
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
            currentDiscordMappingState.status === 'ready'
              ? 'This Discord role is ready for Discord reconcile.'
              : currentDiscordMappingState.status === 'needs_attention'
                ? 'Review the diagnostics above before syncing.'
                : 'No Discord role selected yet.'
          }
        />
      }
      matchMode={communityRole.matchMode}
      name={communityRole.name}
      onDelete={onDelete}
      onEdit={onEdit}
      slug={communityRole.slug}
      teamMemberCount={communityRole.teamMemberCount}
      teamName={communityRole.teamName}
    />
  )
}
