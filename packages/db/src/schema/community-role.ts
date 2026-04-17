import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { assetGroup } from './asset'
import { organization, team, user } from './auth'

export const communityRole = sqliteTable(
  'community_role',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    discordRoleId: text('discord_role_id'),
    enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    matchMode: text('match_mode', { enum: ['all', 'any'] }).notNull(),
    name: text('name').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('community_role_discordRoleId_idx').on(table.discordRoleId),
    index('community_role_enabled_idx').on(table.enabled),
    index('community_role_name_idx').on(table.name),
    index('community_role_organizationId_idx').on(table.organizationId),
    uniqueIndex('community_role_organizationId_discordRoleId_idx').on(table.organizationId, table.discordRoleId),
    uniqueIndex('community_role_organizationId_slug_idx').on(table.organizationId, table.slug),
    uniqueIndex('community_role_teamId_idx').on(table.teamId),
  ],
)

export const communityRoleCondition = sqliteTable(
  'community_role_condition',
  {
    assetGroupId: text('asset_group_id')
      .notNull()
      .references(() => assetGroup.id, { onDelete: 'cascade' }),
    communityRoleId: text('community_role_id')
      .notNull()
      .references(() => communityRole.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    maximumAmount: text('maximum_amount'),
    minimumAmount: text('minimum_amount').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('community_role_condition_assetGroupId_idx').on(table.assetGroupId),
    index('community_role_condition_communityRoleId_idx').on(table.communityRoleId),
    uniqueIndex('community_role_condition_communityRoleId_assetGroupId_idx').on(
      table.communityRoleId,
      table.assetGroupId,
    ),
  ],
)

export const communityManagedMember = sqliteTable(
  'community_managed_member',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('community_managed_member_organizationId_idx').on(table.organizationId),
    uniqueIndex('community_managed_member_organizationId_userId_idx').on(table.organizationId, table.userId),
    index('community_managed_member_userId_idx').on(table.userId),
  ],
)

export const communityDiscordConnection = sqliteTable(
  'community_discord_connection',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    diagnostics: text('diagnostics'),
    guildId: text('guild_id').notNull(),
    guildName: text('guild_name'),
    lastCheckedAt: integer('last_checked_at', { mode: 'timestamp_ms' }),
    organizationId: text('organization_id')
      .notNull()
      .primaryKey()
      .references(() => organization.id, { onDelete: 'cascade' }),
    roleSyncEnabled: integer('role_sync_enabled', { mode: 'boolean' }).default(true).notNull(),
    status: text('status', { enum: ['connected', 'needs_attention'] }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex('community_discord_connection_guildId_idx').on(table.guildId)],
)

export const communityDiscordSyncRun = sqliteTable(
  'community_discord_sync_run',
  {
    appliedGrantCount: integer('applied_grant_count').default(0).notNull(),
    appliedRevokeCount: integer('applied_revoke_count').default(0).notNull(),
    blockedAssetGroupIds: text('blocked_asset_group_ids'),
    dependencyAssetGroupIds: text('dependency_asset_group_ids').notNull(),
    dependencyFreshAtStart: integer('dependency_fresh_at_start', { mode: 'boolean' }).notNull(),
    errorMessage: text('error_message'),
    errorPayload: text('error_payload'),
    failedCount: integer('failed_count').default(0).notNull(),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    outcomeCounts: text('outcome_counts').notNull(),
    rolesBlockedCount: integer('roles_blocked_count').default(0).notNull(),
    rolesReadyCount: integer('roles_ready_count').default(0).notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    status: text('status', { enum: ['failed', 'partial', 'running', 'skipped', 'succeeded'] }).notNull(),
    triggerSource: text('trigger_source', { enum: ['manual', 'scheduled'] }).notNull(),
    usersChangedCount: integer('users_changed_count').default(0).notNull(),
  },
  (table) => [
    index('community_discord_sync_run_organizationId_startedAt_idx').on(table.organizationId, table.startedAt),
    index('community_discord_sync_run_organizationId_status_startedAt_idx').on(
      table.organizationId,
      table.status,
      table.startedAt,
    ),
  ],
)

export const communityMembershipSyncRun = sqliteTable(
  'community_membership_sync_run',
  {
    addToOrganizationCount: integer('add_to_organization_count').default(0).notNull(),
    addToTeamCount: integer('add_to_team_count').default(0).notNull(),
    blockedAssetGroupIds: text('blocked_asset_group_ids'),
    dependencyAssetGroupIds: text('dependency_asset_group_ids').notNull(),
    dependencyFreshAtStart: integer('dependency_fresh_at_start', { mode: 'boolean' }).notNull(),
    errorMessage: text('error_message'),
    errorPayload: text('error_payload'),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    qualifiedUserCount: integer('qualified_user_count').default(0).notNull(),
    removeFromOrganizationCount: integer('remove_from_organization_count').default(0).notNull(),
    removeFromTeamCount: integer('remove_from_team_count').default(0).notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    status: text('status', { enum: ['failed', 'running', 'skipped', 'succeeded'] }).notNull(),
    triggerSource: text('trigger_source', { enum: ['manual', 'scheduled'] }).notNull(),
    usersChangedCount: integer('users_changed_count').default(0).notNull(),
  },
  (table) => [
    index('community_membership_sync_run_organizationId_startedAt_idx').on(table.organizationId, table.startedAt),
    index('community_membership_sync_run_organizationId_status_startedAt_idx').on(
      table.organizationId,
      table.status,
      table.startedAt,
    ),
  ],
)

export const communityDiscordConnectionRelations = relations(communityDiscordConnection, ({ one }) => ({
  organization: one(organization, {
    fields: [communityDiscordConnection.organizationId],
    references: [organization.id],
  }),
}))

export const communityDiscordSyncRunRelations = relations(communityDiscordSyncRun, ({ one }) => ({
  organization: one(organization, {
    fields: [communityDiscordSyncRun.organizationId],
    references: [organization.id],
  }),
}))

export const communityManagedMemberRelations = relations(communityManagedMember, ({ one }) => ({
  organization: one(organization, {
    fields: [communityManagedMember.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [communityManagedMember.userId],
    references: [user.id],
  }),
}))

export const communityMembershipSyncRunRelations = relations(communityMembershipSyncRun, ({ one }) => ({
  organization: one(organization, {
    fields: [communityMembershipSyncRun.organizationId],
    references: [organization.id],
  }),
}))

export const communityRoleConditionRelations = relations(communityRoleCondition, ({ one }) => ({
  assetGroup: one(assetGroup, {
    fields: [communityRoleCondition.assetGroupId],
    references: [assetGroup.id],
  }),
  communityRole: one(communityRole, {
    fields: [communityRoleCondition.communityRoleId],
    references: [communityRole.id],
  }),
}))

export const communityRoleRelations = relations(communityRole, ({ many, one }) => ({
  conditions: many(communityRoleCondition),
  organization: one(organization, {
    fields: [communityRole.organizationId],
    references: [organization.id],
  }),
  team: one(team, {
    fields: [communityRole.teamId],
    references: [team.id],
  }),
}))
