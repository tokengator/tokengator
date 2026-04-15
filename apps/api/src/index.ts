import { join } from 'node:path'
import { createTanStackStartBunServeConfig } from 'tanstack-start-bun-server'
import { createApiApp } from '@tokengator/api/app'
import { getDb } from '@tokengator/db'
import { env } from '@tokengator/env/api'
import { configureAppLogger, getAppLogger } from '@tokengator/logger'
import { getApiPort } from './get-api-port'
import { startApiDiscordBot } from './start-discord-bot'
import { startApiScheduledJobs } from './start-scheduled-jobs'

configureAppLogger({ env })
const logger = getAppLogger('api', 'api-server')
const db = getDb()
const app = createApiApp({ db })

async function main() {
  await startApiDiscordBot({ db })
  startApiScheduledJobs()

  const { fetchHandler: webFetch, routes: webRoutes } = await createTanStackStartBunServeConfig({
    logger: getAppLogger('api', 'web-server'),
    webDistPath: join(import.meta.dir, '../../web/dist'),
  })

  const server = Bun.serve({
    error(error) {
      logger.error(error)
      return new Response('Internal Server Error', { status: 500 })
    },
    port: getApiPort(),
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
}

main().catch((error) => {
  logger.error(error)
  process.exit(1)
})
