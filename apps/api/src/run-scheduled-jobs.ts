import { runScheduledJobsLoop } from '@tokengator/api/scheduled-jobs'

const shutdownController = new AbortController()

function handleShutdown(signal: NodeJS.Signals) {
  if (shutdownController.signal.aborted) {
    return
  }

  console.info(`[scheduled-jobs] received ${signal}; waiting for the current pass to finish`)
  shutdownController.abort()
}

process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)

try {
  await runScheduledJobsLoop({
    logger: console,
    signal: shutdownController.signal,
  })
} finally {
  process.off('SIGINT', handleShutdown)
  process.off('SIGTERM', handleShutdown)
}
