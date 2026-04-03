import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const automationLock = sqliteTable(
  'automation_lock',
  {
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    key: text('key').primaryKey(),
    runId: text('run_id').notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('automation_lock_expiresAt_idx').on(table.expiresAt)],
)
