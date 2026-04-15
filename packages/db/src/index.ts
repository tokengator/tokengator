import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { env } from '@tokengator/env/api'

import * as schema from './schema'

export type CreateDbConfig = {
  authToken?: string
  url: string
}

export function createDb(config: CreateDbConfig) {
  const client = createClient({
    authToken: config.authToken,
    url: config.url,
  })

  return drizzle({ client, schema })
}

export type Database = ReturnType<typeof createDb>

let dbInstance: Database | null = null

export function getDb(): Database {
  if (!dbInstance) {
    dbInstance = createDb({
      authToken: env.DATABASE_AUTH_TOKEN,
      url: env.DATABASE_URL,
    })
  }

  return dbInstance
}

export function setDb(instance: Database): void {
  dbInstance = instance
}

export function resetDb(): void {
  dbInstance = null
}

// Backward-compatible lazy singleton. Existing call sites (`import { db } ...`)
// keep working, but the real connection is created on first access and can be
// swapped via setDb() — which lets tests inject isolated instances.
export const db = new Proxy({} as Database, {
  get(_target, prop, _receiver) {
    const current = getDb() as unknown as Record<PropertyKey, unknown>
    const value = current[prop]

    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(current) : value
  },
})
