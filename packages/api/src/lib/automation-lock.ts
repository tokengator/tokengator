import { and, eq, gt, lte } from 'drizzle-orm'
import { db, type Database } from '@tokengator/db'
import { automationLock } from '@tokengator/db/schema/automation'

import { AUTOMATION_LOCK_TIMEOUT_MS } from './automation-config'

export class AutomationLockConflictError extends Error {
  public readonly key: string

  public constructor(key: string) {
    super(`Automation lock is already held for ${key}.`)

    this.key = key
    this.name = 'AutomationLockConflictError'
  }
}

export class AutomationLockLeaseLostError extends Error {
  public readonly key: string
  public readonly runId: string

  public constructor(input: { key: string; message?: string; runId: string }) {
    super(input.message ?? `Automation lock lease was lost for ${input.key}.`)

    this.key = input.key
    this.name = 'AutomationLockLeaseLostError'
    this.runId = input.runId
  }
}

type AutomationDatabase = Database
export type AutomationTransaction = Parameters<Parameters<AutomationDatabase['transaction']>[0]>[0]
export interface AutomationLockLeaseController {
  ensureOwned: () => Promise<void>
  start: () => void
  stop: () => Promise<void>
}

const AUTOMATION_LOCK_HEARTBEAT_MS = Math.floor(AUTOMATION_LOCK_TIMEOUT_MS / 3)

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

function createAutomationLockLeaseLostError(input: { key: string; runId: string }) {
  return new AutomationLockLeaseLostError({
    key: input.key,
    message: `Automation lock lease was lost before ${input.runId} completed for ${input.key}.`,
    runId: input.runId,
  })
}

async function getAutomationLockRecord(input: { database: AutomationDatabase; key: string }) {
  const [lockRecord] = await input.database
    .select({
      expiresAt: automationLock.expiresAt,
      runId: automationLock.runId,
    })
    .from(automationLock)
    .where(eq(automationLock.key, input.key))
    .limit(1)

  return lockRecord ?? null
}

export function getAutomationLockLeaseLostError(error: unknown): AutomationLockLeaseLostError | null {
  let currentError = error

  while (currentError instanceof Error) {
    if (currentError instanceof AutomationLockLeaseLostError) {
      return currentError
    }

    currentError = currentError.cause
  }

  return null
}

export async function renewAutomationLock(input: {
  database?: AutomationDatabase
  key: string
  now: Date
  runId: string
}) {
  const database = input.database ?? db
  const nextExpiresAt = new Date(input.now.getTime() + AUTOMATION_LOCK_TIMEOUT_MS)
  const [updatedLock] = await database
    .update(automationLock)
    .set({
      expiresAt: nextExpiresAt,
    })
    .where(
      and(
        eq(automationLock.key, input.key),
        eq(automationLock.runId, input.runId),
        gt(automationLock.expiresAt, input.now),
      ),
    )
    .returning({
      expiresAt: automationLock.expiresAt,
      key: automationLock.key,
    })

  if (!updatedLock) {
    return {
      expiresAt: null,
      renewed: false as const,
    }
  }

  return {
    expiresAt: updatedLock.expiresAt,
    renewed: true as const,
  }
}

export function createAutomationLockLeaseController(input: {
  database?: AutomationDatabase
  key: string
  now?: () => Date
  runId: string
}): AutomationLockLeaseController {
  const database = input.database ?? db
  const now = input.now ?? (() => new Date())
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  let lostError: AutomationLockLeaseLostError | null = null
  let pendingCheck: Promise<void> | null = null
  let stopped = false

  function clearHeartbeatTimer() {
    if (!heartbeatTimer) {
      return
    }

    clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }

  function markLeaseLost() {
    lostError ??= createAutomationLockLeaseLostError({
      key: input.key,
      runId: input.runId,
    })
    clearHeartbeatTimer()

    return lostError
  }

  function throwIfLeaseLost() {
    if (lostError) {
      throw lostError
    }
  }

  async function runSerialized(work: () => Promise<void>) {
    const previousCheck = pendingCheck ?? Promise.resolve()
    const currentWork = previousCheck.then(work)
    const queuedWork = currentWork.then(
      () => {
        if (pendingCheck === queuedWork) {
          pendingCheck = null
        }
      },
      () => {
        if (pendingCheck === queuedWork) {
          pendingCheck = null
        }
      },
    )
    pendingCheck = queuedWork

    await currentWork
  }

  async function verifyLease(currentNow: Date) {
    const currentLock = await getAutomationLockRecord({
      database,
      key: input.key,
    })

    if (!currentLock || currentLock.runId !== input.runId || currentLock.expiresAt <= currentNow) {
      throw markLeaseLost()
    }
  }

  async function renewLease(currentNow: Date) {
    const renewedLock = await renewAutomationLock({
      database,
      key: input.key,
      now: currentNow,
      runId: input.runId,
    })

    if (renewedLock.renewed) {
      return
    }

    await verifyLease(currentNow)
    throw markLeaseLost()
  }

  function scheduleHeartbeat() {
    if (stopped || lostError) {
      return
    }

    clearHeartbeatTimer()
    heartbeatTimer = setTimeout(() => {
      void runSerialized(async () => {
        if (stopped || lostError) {
          return
        }

        await renewLease(now())
      }).catch(() => {
        // The lease-loss state is cached in the controller and surfaced by ensureOwned().
      })

      scheduleHeartbeat()
    }, AUTOMATION_LOCK_HEARTBEAT_MS)
  }

  return {
    async ensureOwned() {
      throwIfLeaseLost()
      await runSerialized(async () => {
        const currentNow = now()

        await verifyLease(currentNow)
      })
    },
    start() {
      scheduleHeartbeat()
    },
    async stop() {
      stopped = true
      clearHeartbeatTimer()

      try {
        await pendingCheck
      } catch {
        // The caller only needs the controller quiesced before lock release.
      }
    },
  }
}

export async function releaseAutomationLock(input: { database?: AutomationDatabase; key: string; runId: string }) {
  const database = input.database ?? db

  await database
    .delete(automationLock)
    .where(and(eq(automationLock.key, input.key), eq(automationLock.runId, input.runId)))
}
