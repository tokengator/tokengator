import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const assetGroup = sqliteTable(
  'asset_group',
  {
    address: text('address').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    indexingStartedAt: integer('indexing_started_at', { mode: 'timestamp_ms' }),
    label: text('label').notNull(),
    type: text('type', { enum: ['collection', 'mint'] }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('asset_group_address_idx').on(table.address),
    index('asset_group_createdAt_idx').on(table.createdAt),
    index('asset_group_enabled_idx').on(table.enabled),
    index('asset_group_label_idx').on(table.label),
    index('asset_group_type_idx').on(table.type),
  ],
)

export const asset = sqliteTable(
  'asset',
  {
    address: text('address').notNull(),
    addressLower: text('address_lower').notNull(),
    amount: text('amount').notNull(),
    assetGroupId: text('asset_group_id')
      .notNull()
      .references(() => assetGroup.id, { onDelete: 'cascade' }),
    firstSeenAt: integer('first_seen_at', { mode: 'timestamp_ms' }).notNull(),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    indexedAssetId: text('indexed_asset_id').notNull(),
    indexedAt: integer('indexed_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
    metadata: text('metadata'),
    metadataDescription: text('metadata_description'),
    metadataImageUrl: text('metadata_image_url'),
    metadataJson: text('metadata_json'),
    metadataJsonUrl: text('metadata_json_url'),
    metadataName: text('metadata_name'),
    metadataProgramAccount: text('metadata_program_account'),
    metadataSymbol: text('metadata_symbol'),
    owner: text('owner').notNull(),
    ownerLower: text('owner_lower').notNull(),
    page: integer('page').notNull(),
    raw: text('raw'),
    resolverId: text('resolver_id').notNull(),
    resolverKind: text('resolver_kind', { enum: ['helius-collection-assets', 'helius-token-accounts'] }).notNull(),
  },
  (table) => [
    index('asset_assetGroupId_addressLower_idx').on(table.assetGroupId, table.addressLower),
    index('asset_assetGroupId_idx').on(table.assetGroupId),
    index('asset_assetGroupId_indexedAt_idx').on(table.assetGroupId, table.indexedAt),
    index('asset_assetGroupId_ownerLower_idx').on(table.assetGroupId, table.ownerLower),
    index('asset_assetGroupId_resolverKind_idx').on(table.assetGroupId, table.resolverKind),
    uniqueIndex('asset_indexedAssetId_idx').on(table.indexedAssetId),
  ],
)

export const assetGroupRelations = relations(assetGroup, ({ many }) => ({
  assets: many(asset),
}))

export const assetRelations = relations(asset, ({ one }) => ({
  assetGroup: one(assetGroup, {
    fields: [asset.assetGroupId],
    references: [assetGroup.id],
  }),
}))
