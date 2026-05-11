import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..')
const MIGRATION_TIMEOUT_MS = 30_000
const TEST_DATABASE_DIR = resolve(tmpdir(), `tokengator-db-migration-tests-${crypto.randomUUID()}`)
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'migrations.sqlite')).toString()

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function migrateDatabase(databaseUrl: string) {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', 'db:migrate'],
    cwd: DB_PACKAGE_DIR,
    env: {
      ...process.env,
      DATABASE_AUTH_TOKEN: 'test-token',
      DATABASE_URL: databaseUrl,
    },
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: MIGRATION_TIMEOUT_MS,
  })

  if (result.exitedDueToTimeout) {
    throw new Error(`Migration timed out after ${MIGRATION_TIMEOUT_MS} ms`)
  }

  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to migrate the test database.\n${decodeOutput(result.stdout)}\n${decodeOutput(result.stderr)}`,
    )
  }
}

beforeAll(() => {
  mkdirSync(TEST_DATABASE_DIR, {
    recursive: true,
  })
})

afterAll(() => {
  rmSync(TEST_DATABASE_DIR, {
    force: true,
    recursive: true,
  })
})

describe('database migrations', () => {
  test('creates the current schema and can run again without adding migrations', async () => {
    migrateDatabase(TEST_DATABASE_URL)

    const client = createClient({
      authToken: 'test-token',
      url: TEST_DATABASE_URL,
    })

    try {
      const tables = await client.execute("select name from sqlite_master where type = 'table' order by name")
      const tableNames = tables.rows.map((row) => String(row.name))

      for (const tableName of [
        '__drizzle_migrations',
        'account',
        'apikey',
        'asset',
        'asset_group',
        'automation_lock',
        'community_role',
        'identity',
        'organization',
        'session',
        'user',
      ]) {
        expect(tableNames).toContain(tableName)
      }

      const firstMigrationCountResult = await client.execute('select count(*) as count from __drizzle_migrations')
      const firstMigrationCount = Number(firstMigrationCountResult.rows[0]?.count ?? 0)

      expect(firstMigrationCount).toBeGreaterThan(0)

      migrateDatabase(TEST_DATABASE_URL)

      const secondMigrationCountResult = await client.execute('select count(*) as count from __drizzle_migrations')
      const secondMigrationCount = Number(secondMigrationCountResult.rows[0]?.count ?? 0)

      expect(secondMigrationCount).toBe(firstMigrationCount)
    } finally {
      client.close()
    }
  }, 70_000)
})
