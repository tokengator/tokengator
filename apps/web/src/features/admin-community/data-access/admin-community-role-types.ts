import { orpc } from '@/lib/orpc'

export type AdminCommunityDiscordGuildRolesResult = Awaited<
  ReturnType<typeof orpc.adminCommunityRole.listDiscordGuildRoles.call>
>
export type AdminCommunityDiscordGuildRoleRecord = AdminCommunityDiscordGuildRolesResult['guildRoles'][number]
export type AdminCommunityDiscordSyncResult =
  | Awaited<ReturnType<typeof orpc.adminCommunityRole.applyDiscordRoleSync.call>>
  | Awaited<ReturnType<typeof orpc.adminCommunityRole.previewDiscordRoleSync.call>>
type AdminCommunityDiscordSyncResultWithUsers = Extract<AdminCommunityDiscordSyncResult, { users: unknown[] }>
export type AdminCommunityDiscordOutcomeStatus =
  AdminCommunityDiscordSyncResultWithUsers['users'][number]['outcomes'][number]['status']
export type AdminCommunityDiscordSyncRunsResult = Extract<AdminCommunityRoleSyncRunsResult, { kind: 'discord' }>
export type AdminCommunityMembershipSyncResult = Awaited<ReturnType<typeof orpc.adminCommunityRole.previewSync.call>>
export type AdminCommunityMembershipSyncRunsResult = Extract<AdminCommunityRoleSyncRunsResult, { kind: 'membership' }>
export type AdminCommunityRoleRecord = Awaited<
  ReturnType<typeof orpc.adminCommunityRole.list.call>
>['communityRoles'][number]
export type AdminCommunityRoleSyncRunsResult = Awaited<ReturnType<typeof orpc.adminCommunityRole.listRuns.call>>
export type AdminCommunitySyncRunStatus = AdminCommunityRoleSyncRunsResult['runs'][number]['status']
