import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  banExpires: integer('ban_expires', { mode: 'timestamp_ms' }),
  banned: integer('banned', { mode: 'boolean' }).default(false).notNull(),
  banReason: text('ban_reason'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  developerMode: integer('developer_mode', { mode: 'boolean' })
    .default(sql`0`)
    .notNull(),
  displayUsername: text('display_username'),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  id: text('id').primaryKey(),
  image: text('image'),
  name: text('name').notNull(),
  private: integer('private', { mode: 'boolean' })
    .default(sql`0`)
    .notNull(),
  role: text('role', { enum: ['admin', 'user'] })
    .default('user')
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  username: text('username').unique(),
})

export const organization = sqliteTable(
  'organization',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id').primaryKey(),
    logo: text('logo'),
    metadata: text('metadata'),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
  },
  (table) => [index('organization_slug_idx').on(table.slug)],
)

export const session = sqliteTable(
  'session',
  {
    activeOrganizationId: text('active_organization_id'),
    activeTeamId: text('active_team_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    id: text('id').primaryKey(),
    impersonatedBy: text('impersonated_by'),
    ipAddress: text('ip_address'),
    token: text('token').notNull().unique(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('session_activeOrganizationId_idx').on(table.activeOrganizationId),
    index('session_activeTeamId_idx').on(table.activeTeamId),
    index('session_userId_idx').on(table.userId),
  ],
)

export const account = sqliteTable(
  'account',
  {
    accessToken: text('access_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    accountId: text('account_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id').primaryKey(),
    idToken: text('id_token'),
    password: text('password'),
    providerId: text('provider_id').notNull(),
    refreshToken: text('refresh_token'),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

export const identity = sqliteTable(
  'identity',
  {
    avatarUrl: text('avatar_url'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    displayName: text('display_name'),
    email: text('email'),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    isPrimary: integer('is_primary', { mode: 'boolean' }).default(false).notNull(),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }).notNull(),
    linkedAt: integer('linked_at', { mode: 'timestamp_ms' }).notNull(),
    profile: text('profile'),
    provider: text('provider', { enum: ['discord', 'solana'] }).notNull(),
    providerId: text('provider_id').notNull(),
    referenceId: text('reference_id').notNull(),
    referenceType: text('reference_type', { enum: ['account', 'solana_wallet'] }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    username: text('username'),
  },
  (table) => [
    uniqueIndex('identity_provider_providerId_idx').on(table.provider, table.providerId),
    uniqueIndex('identity_referenceType_referenceId_idx').on(table.referenceType, table.referenceId),
    index('identity_userId_idx').on(table.userId),
    index('identity_userId_provider_idx').on(table.userId, table.provider),
  ],
)

export const invitation = sqliteTable(
  'invitation',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    email: text('email').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    id: text('id').primaryKey(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    role: text('role'),
    status: text('status').notNull(),
    teamId: text('team_id').references(() => team.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('invitation_email_idx').on(table.email),
    index('invitation_inviterId_idx').on(table.inviterId),
    index('invitation_organizationId_idx').on(table.organizationId),
    index('invitation_teamId_idx').on(table.teamId),
  ],
)

export const member = sqliteTable(
  'member',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('member_organizationId_idx').on(table.organizationId), index('member_userId_idx').on(table.userId)],
)

export const team = sqliteTable(
  'team',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('team_name_idx').on(table.name), index('team_organizationId_idx').on(table.organizationId)],
)

export const teamMember = sqliteTable(
  'team_member',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id').primaryKey(),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('team_member_teamId_idx').on(table.teamId),
    index('team_member_userId_idx').on(table.userId),
    uniqueIndex('team_member_teamId_userId_idx').on(table.teamId, table.userId),
  ],
)

export const verification = sqliteTable(
  'verification',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    value: text('value').notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const solanaWallet = sqliteTable(
  'solana_wallet',
  {
    address: text('address').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    isPrimary: integer('is_primary', { mode: 'boolean' }).default(false).notNull(),
    name: text('name'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('solana_wallet_address_idx').on(table.address),
    index('solana_wallet_userId_idx').on(table.userId),
  ],
)

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const identityRelations = relations(identity, ({ one }) => ({
  user: one(user, {
    fields: [identity.userId],
    references: [user.id],
  }),
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  team: one(team, {
    fields: [invitation.teamId],
    references: [team.id],
  }),
}))

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}))

export const organizationRelations = relations(organization, ({ many }) => ({
  invitations: many(invitation),
  members: many(member),
  teams: many(team),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  activeOrganization: one(organization, {
    fields: [session.activeOrganizationId],
    references: [organization.id],
  }),
  activeTeam: one(team, {
    fields: [session.activeTeamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const solanaWalletRelations = relations(solanaWallet, ({ one }) => ({
  user: one(user, {
    fields: [solanaWallet.userId],
    references: [user.id],
  }),
}))

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
}))

export const teamRelations = relations(team, ({ many, one }) => ({
  invitations: many(invitation),
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id],
  }),
  teamMembers: many(teamMember),
}))

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  identities: many(identity),
  invitations: many(invitation),
  members: many(member),
  sessions: many(session),
  solanaWallets: many(solanaWallet),
  teamMembers: many(teamMember),
}))
