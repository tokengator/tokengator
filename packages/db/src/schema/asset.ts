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
    facetTotals: text('facet_totals'),
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

export const assetGroupIndexRun = sqliteTable(
  'asset_group_index_run',
  {
    assetGroupId: text('asset_group_id')
      .notNull()
      .references(() => assetGroup.id, { onDelete: 'cascade' }),
    deletedCount: integer('deleted_count').default(0).notNull(),
    errorMessage: text('error_message'),
    errorPayload: text('error_payload'),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    insertedCount: integer('inserted_count').default(0).notNull(),
    pagesProcessed: integer('pages_processed').default(0).notNull(),
    resolverKind: text('resolver_kind', { enum: ['helius-collection-assets', 'helius-token-accounts'] }).notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    status: text('status', { enum: ['failed', 'running', 'skipped', 'succeeded'] }).notNull(),
    totalCount: integer('total_count').default(0).notNull(),
    triggerSource: text('trigger_source', { enum: ['manual', 'scheduled'] }).notNull(),
    updatedCount: integer('updated_count').default(0).notNull(),
  },
  (table) => [
    index('asset_group_index_run_assetGroupId_startedAt_idx').on(table.assetGroupId, table.startedAt),
    index('asset_group_index_run_assetGroupId_status_startedAt_idx').on(
      table.assetGroupId,
      table.status,
      table.startedAt,
    ),
  ],
)

export const asset = sqliteTable(
  'asset',
  {
    address: text('address').notNull(),
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
    page: integer('page').notNull(),
    raw: text('raw'),
    resolverId: text('resolver_id').notNull(),
    resolverKind: text('resolver_kind', { enum: ['helius-collection-assets', 'helius-token-accounts'] }).notNull(),
  },
  (table) => [
    index('asset_assetGroupId_address_idx').on(table.assetGroupId, table.address),
    index('asset_assetGroupId_idx').on(table.assetGroupId),
    index('asset_assetGroupId_indexedAt_idx').on(table.assetGroupId, table.indexedAt),
    index('asset_assetGroupId_owner_idx').on(table.assetGroupId, table.owner),
    index('asset_assetGroupId_resolverKind_idx').on(table.assetGroupId, table.resolverKind),
    uniqueIndex('asset_indexedAssetId_idx').on(table.indexedAssetId),
  ],
)

export const assetTrait = sqliteTable(
  'asset_trait',
  {
    assetGroupId: text('asset_group_id')
      .notNull()
      .references(() => assetGroup.id, { onDelete: 'cascade' }),
    assetId: text('asset_id')
      .notNull()
      .references(() => asset.id, { onDelete: 'cascade' }),
    id: text('id')
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    traitKey: text('trait_key').notNull(),
    traitLabel: text('trait_label').notNull(),
    traitValue: text('trait_value').notNull(),
    traitValueLabel: text('trait_value_label').notNull(),
  },
  (table) => [
    index('asset_trait_assetGroupId_assetId_idx').on(table.assetGroupId, table.assetId),
    index('asset_trait_assetGroupId_traitKey_traitValue_idx').on(table.assetGroupId, table.traitKey, table.traitValue),
    index('asset_trait_assetId_idx').on(table.assetId),
    uniqueIndex('asset_trait_assetId_traitKey_traitValue_idx').on(table.assetId, table.traitKey, table.traitValue),
  ],
)

export const assetGroupRelations = relations(assetGroup, ({ many }) => ({
  assets: many(asset),
  indexRuns: many(assetGroupIndexRun),
  traits: many(assetTrait),
}))

export const assetRelations = relations(asset, ({ many, one }) => ({
  assetGroup: one(assetGroup, {
    fields: [asset.assetGroupId],
    references: [assetGroup.id],
  }),
  traits: many(assetTrait),
}))

export const assetTraitRelations = relations(assetTrait, ({ one }) => ({
  asset: one(asset, {
    fields: [assetTrait.assetId],
    references: [asset.id],
  }),
  assetGroup: one(assetGroup, {
    fields: [assetTrait.assetGroupId],
    references: [assetGroup.id],
  }),
}))

export const assetGroupIndexRunRelations = relations(assetGroupIndexRun, ({ one }) => ({
  assetGroup: one(assetGroup, {
    fields: [assetGroupIndexRun.assetGroupId],
    references: [assetGroup.id],
  }),
}))
