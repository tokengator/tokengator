import type {
  DiscordGuildRoleInspectionDiagnostics,
  DiscordGuildRoleRecord,
} from '@tokengator/discord/inspect-discord-guild-roles'
import type {
  CommunityDiscordSyncRunRecord,
  CommunityMembershipSyncRunRecord,
  CommunityRoleDiscordSyncApply,
  CommunityRoleDiscordSyncPreview,
  CommunityRoleSyncPreview,
  CommunityRoleSyncStatus,
} from '../../../features/community-role-sync'

export type AdminCommunityRoleConditionEntity = {
  assetGroupAddress: string
  assetGroupEnabled: boolean
  assetGroupId: string
  assetGroupLabel: string
  assetGroupType: 'collection' | 'mint'
  id: string
  maximumAmount: string | null
  minimumAmount: string
}

export type AdminCommunityRoleEntity = {
  conditions: AdminCommunityRoleConditionEntity[]
  createdAt: Date
  discordRoleId?: string | null
  enabled: boolean
  id: string
  matchMode: 'all' | 'any'
  name: string
  organizationId: string
  slug: string
  teamId: string
  teamMemberCount: number
  teamName: string
  updatedAt: Date
}

export type AdminCommunityRoleDiscordGuildRolesResult = {
  connection: {
    diagnostics: DiscordGuildRoleInspectionDiagnostics
    guildId: string
    guildName: string | null
    lastCheckedAt: Date
    status: 'connected' | 'needs_attention'
  } | null
  guildRoles: DiscordGuildRoleRecord[]
}

export type AdminCommunityRoleDiscordMappingStatus = {
  checks: string[]
  status: 'needs_attention' | 'not_mapped' | 'ready'
}

export type AdminCommunityRoleSetDiscordRoleMappingResult = {
  communityRole: AdminCommunityRoleEntity
  mapping: AdminCommunityRoleDiscordMappingStatus
}

export type AdminCommunityRoleApplyDiscordRoleSyncResult = CommunityRoleDiscordSyncApply
export type AdminCommunityRoleApplySyncResult = CommunityRoleSyncPreview
export type AdminCommunityRoleListRunsResult =
  | {
      kind: 'discord'
      runs: CommunityDiscordSyncRunRecord[]
    }
  | {
      kind: 'membership'
      runs: CommunityMembershipSyncRunRecord[]
    }
export type AdminCommunityRolePreviewDiscordRoleSyncResult = CommunityRoleDiscordSyncPreview
export type AdminCommunityRolePreviewSyncResult = CommunityRoleSyncPreview
export type AdminCommunityRoleSyncStatusResult = CommunityRoleSyncStatus
