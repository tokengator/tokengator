import { env } from '@tokengator/env/api'
import { configureAppLogger } from '@tokengator/logger'
import { runScheduledJobsProcess } from './start-scheduled-jobs'

configureAppLogger({ env })

await runScheduledJobsProcess()
