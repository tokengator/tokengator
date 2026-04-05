import { runScheduledJobsLoop } from '@tokengator/api/scheduled-jobs'
import { env } from '@tokengator/env/api'
import { configureAppLogger, getAppLogger } from '@tokengator/logger'

configureAppLogger({ env })

const logger = getAppLogger('api', 'run-scheduled-jobs')

const shutdownController = new AbortController()

function handleShutdown(signal: NodeJS.Signals) {
  if (shutdownController.signal.aborted) {
    return
  }

  logger.info('[scheduled-jobs] received {signal}; waiting for the current pass to finish', {
    signal,
  })
  shutdownController.abort()
}

process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)

try {
  await runScheduledJobsLoop({
    signal: shutdownController.signal,
  })
} finally {
  process.off('SIGINT', handleShutdown)
  process.off('SIGTERM', handleShutdown)
}
