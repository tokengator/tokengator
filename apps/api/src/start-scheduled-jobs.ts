import { runScheduledJobsLoop } from '@tokengator/api/scheduled-jobs'
import { env } from '@tokengator/env/api'
import { formatLogError, getAppLogger } from '@tokengator/logger'

type ScheduledJobsRuntime = {
  controller: AbortController
  promise: Promise<void>
}

declare global {
  var __tokengatorScheduledJobsRuntime: ScheduledJobsRuntime | undefined
  var __tokengatorScheduledJobsShutdownHandlersInstalled: boolean | undefined
}

const logger = getAppLogger('api', 'scheduled-jobs')

function createScheduledJobsRuntime() {
  const controller = new AbortController()
  const promise = runScheduledJobsLoop({
    signal: controller.signal,
  }).finally(() => {
    if (globalThis.__tokengatorScheduledJobsRuntime?.controller === controller) {
      globalThis.__tokengatorScheduledJobsRuntime = undefined
    }
  })

  void promise.catch((error) => {
    logger.error('[scheduled-jobs] crashed error={error}', {
      error: formatLogError(error),
    })
  })

  return {
    controller,
    promise,
  } satisfies ScheduledJobsRuntime
}

function getScheduledJobsRuntime() {
  globalThis.__tokengatorScheduledJobsRuntime ??= createScheduledJobsRuntime()

  return globalThis.__tokengatorScheduledJobsRuntime
}

function handleShutdown(signal: NodeJS.Signals) {
  const runtime = globalThis.__tokengatorScheduledJobsRuntime

  if (!runtime || runtime.controller.signal.aborted) {
    return
  }

  logger.info('[scheduled-jobs] received {signal}; waiting for the current pass to finish', {
    signal,
  })
  runtime.controller.abort()
}

function installShutdownHandlers() {
  if (globalThis.__tokengatorScheduledJobsShutdownHandlersInstalled) {
    return
  }

  process.on('SIGINT', handleShutdown)
  process.on('SIGTERM', handleShutdown)
  globalThis.__tokengatorScheduledJobsShutdownHandlersInstalled = true
}

function shouldStartScheduledJobs() {
  return env.NODE_ENV !== 'test' && env.SCHEDULER_START
}

export function startApiScheduledJobs() {
  if (!shouldStartScheduledJobs()) {
    return
  }

  getScheduledJobsRuntime()
}

export async function runScheduledJobsProcess() {
  installShutdownHandlers()

  await getScheduledJobsRuntime().promise
}
