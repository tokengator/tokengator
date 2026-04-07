import { join } from 'node:path'
import { createApiApp } from '@tokengator/api/app'
import { env } from '@tokengator/env/api'
import { configureAppLogger, getAppLogger } from '@tokengator/logger'
import { startApiDiscordBot } from './start-discord-bot'
import { startApiScheduledJobs } from './start-scheduled-jobs'
import { createWebServeConfig } from './start-web'

configureAppLogger({ env })
const logger = getAppLogger('api', 'api-server')
const app = createApiApp()

await startApiDiscordBot()
startApiScheduledJobs()

const { fetchHandler: webFetch, routes: webRoutes } = await createWebServeConfig({
  logger: getAppLogger('api', 'web-server'),
  webDistPath: join(import.meta.dir, '../../web/dist'),
})

const server = Bun.serve({
  error(error) {
    logger.error(error)
    return new Response('Internal Server Error', { status: 500 })
  },
  port: Number(process.env.PORT ?? 3000),
  routes: {
    '/api': (req) => app.fetch(req),
    '/api-reference': (req) => app.fetch(req),
    '/api-reference/*': (req) => app.fetch(req),
    '/api/*': (req) => app.fetch(req),
    '/rpc': (req) => app.fetch(req),
    '/rpc/*': (req) => app.fetch(req),
    ...webRoutes,
    '/*': (req) => webFetch(req),
  },
})

logger.info(`Server listening on ${server.url}`)
