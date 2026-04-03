import { and, eq, lte } from 'drizzle-orm'
import { db, type Database } from '@tokengator/db'
import { automationLock } from '@tokengator/db/schema/automation'

export class AutomationLockConflictError extends Error {
  public readonly key: string

  public constructor(key: string) {
    super(`Automation lock is already held for ${key}.`)

    this.key = key
    this.name = 'AutomationLockConflictError'
  }
}

type AutomationDatabase = Database
export type AutomationTransaction = Parameters<Parameters<AutomationDatabase['transaction']>[0]>[0]

interface AcquireAutomationLockOptions {
  database?: AutomationDatabase
  expiresAt: Date
  key: string
  runId: string
  startedAt: Date
  onStaleLockStolen?: (input: {
    currentRunId: string
    previousRunId: string
    stolenAt: Date
    transaction: AutomationTransaction
  }) => Promise<void>
}

export async function acquireAutomationLock(options: AcquireAutomationLockOptions) {
  const database = options.database ?? db

  return await database.transaction(async (transaction) => {
    const [existingLock] = await transaction
      .select({
        expiresAt: automationLock.expiresAt,
        key: automationLock.key,
        runId: automationLock.runId,
        startedAt: automationLock.startedAt,
      })
      .from(automationLock)
      .where(eq(automationLock.key, options.key))
      .limit(1)

    if (!existingLock) {
      const [insertedLock] = await transaction
        .insert(automationLock)
        .values({
          expiresAt: options.expiresAt,
          key: options.key,
          runId: options.runId,
          startedAt: options.startedAt,
        })
        .onConflictDoNothing({
          target: automationLock.key,
        })
        .returning({
          key: automationLock.key,
        })

      if (!insertedLock) {
        return {
          acquired: false as const,
          staleRunId: null,
        }
      }

      return {
        acquired: true as const,
        staleRunId: null,
      }
    }

    if (existingLock.expiresAt > options.startedAt) {
      return {
        acquired: false as const,
        staleRunId: null,
      }
    }

    const [updatedLock] = await transaction
      .update(automationLock)
      .set({
        expiresAt: options.expiresAt,
        runId: options.runId,
        startedAt: options.startedAt,
      })
      .where(and(eq(automationLock.key, options.key), lte(automationLock.expiresAt, options.startedAt)))
      .returning({
        key: automationLock.key,
      })

    if (!updatedLock) {
      return {
        acquired: false as const,
        staleRunId: null,
      }
    }

    await options.onStaleLockStolen?.({
      currentRunId: options.runId,
      previousRunId: existingLock.runId,
      stolenAt: options.startedAt,
      transaction,
    })

    return {
      acquired: true as const,
      staleRunId: existingLock.runId,
    }
  })
}

export async function releaseAutomationLock(input: { database?: AutomationDatabase; key: string; runId: string }) {
  const database = input.database ?? db

  await database
    .delete(automationLock)
    .where(and(eq(automationLock.key, input.key), eq(automationLock.runId, input.runId)))
}
