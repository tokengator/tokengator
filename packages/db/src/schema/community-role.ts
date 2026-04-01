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
    index('community_role_enabled_idx').on(table.enabled),
    index('community_role_name_idx').on(table.name),
    index('community_role_organizationId_idx').on(table.organizationId),
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
