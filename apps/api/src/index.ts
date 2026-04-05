import { createApiApp } from '@tokengator/api/app'
import { env } from '@tokengator/env/api'
import { configureAppLogger } from '@tokengator/logger'
import { startApiDiscordBot } from './start-discord-bot'
import { startApiScheduledJobs } from './start-scheduled-jobs'

configureAppLogger({ env })

const app = createApiApp()

await startApiDiscordBot()
startApiScheduledJobs()

export default app
