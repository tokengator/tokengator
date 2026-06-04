import { join } from 'node:path'
import { createTanStackStartBunServeConfig } from 'tanstack-start-bun-server'
import { createApiApp } from '@tokengator/api/app'
import { writeOpenApiDocument } from '@tokengator/api/write-openapi-document'
import { env } from '@tokengator/env/api'
import { configureAppLogger, formatLogError, getAppLogger } from '@tokengator/logger'
import { startApiDiscordBot } from './start-discord-bot'
import { startApiScheduledJobs } from './start-scheduled-jobs'

configureAppLogger({ env })
const logger = getAppLogger('api', 'api-server')
const app = createApiApp()

interface ResponseLike {
  arrayBuffer(): Promise<ArrayBuffer>
  headers: Headers
  status: number
  statusText?: string
}

async function normalizeWebResponse(response: unknown): Promise<Response> {
  if (response instanceof Response) {
    return response
  }

  const responseLike = response as ResponseLike
  const headers = new Headers(responseLike.headers)
  const status = responseLike.status

  if (status === 101) {
    headers.set('x-original-status', String(status))
    if (responseLike.statusText) {
      headers.set('x-original-status-text', responseLike.statusText)
    }

    return new Response(null, {
      headers,
      status: 200,
    })
  }

  if (status === 204 || status === 205 || status === 304) {
    return new Response(null, {
      headers,
      status,
      statusText: responseLike.statusText,
    })
  }

  return new Response(await responseLike.arrayBuffer(), {
    headers,
    status,
    statusText: responseLike.statusText,
  })
}

async function main() {
  if (env.NODE_ENV === 'development') {
    void writeOpenApiDocument().catch((error) => {
      logger.error('Failed to write OpenAPI document: {error}', {
        error: formatLogError(error),
      })
    })
  }

  await startApiDiscordBot()
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
    port: env.API_PORT,
    routes: {
      '/api': (req) => app.fetch(req),
      '/api-reference': (req) => app.fetch(req),
      '/api-reference/*': (req) => app.fetch(req),
      '/api/*': (req) => app.fetch(req),
      '/rpc': (req) => app.fetch(req),
      '/rpc/*': (req) => app.fetch(req),
      ...webRoutes,
      '/*': async (req) => normalizeWebResponse(await webFetch(req)),
    },
  })

  logger.info(`Server listening on ${server.url}`)
}

main().catch((error) => {
  logger.error(error)
  process.exit(1)
})
