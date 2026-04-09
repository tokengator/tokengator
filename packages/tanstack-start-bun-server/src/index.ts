import { createConsoleLogger, type Logger } from './logger'
import { initializeServerHandler } from './server-handler'
import { initializeStaticRoutes, type StaticAssetRouteHandler } from './static-assets'

export const DEFAULT_GZIP_MIME_TYPES = [
  'application/javascript',
  'application/json',
  'application/xml',
  'image/svg+xml',
  'text/',
] as const

export type { Logger } from './logger'
export { createConsoleLogger }

export interface TanStackStartBunServeConfig {
  fetchHandler: (request: Request) => Promise<Response>
  routes: Record<string, StaticAssetRouteHandler>
}

export interface TanStackStartBunServeOptions {
  enableEtag?: boolean
  enableGzip?: boolean
  excludePatterns?: string[]
  gzipMimeTypes?: string[]
  gzipMinBytes?: number
  includePatterns?: string[]
  logger?: Logger
  maxPreloadBytes?: number
  verbose?: boolean
  webDistPath: string
}

export async function createTanStackStartBunServeConfig({
  enableEtag = true,
  enableGzip = true,
  excludePatterns = [],
  gzipMimeTypes = [...DEFAULT_GZIP_MIME_TYPES],
  gzipMinBytes = 1024,
  includePatterns = [],
  logger = createConsoleLogger(),
  maxPreloadBytes = 5 * 1024 * 1024,
  verbose = false,
  webDistPath,
}: TanStackStartBunServeOptions): Promise<TanStackStartBunServeConfig> {
  logger.debug('Starting web server')

  const handler = await initializeServerHandler({
    logger,
    webDistPath,
  })

  logger.debug('TanStack Start application handler initialized')

  const { routes } = await initializeStaticRoutes({
    enableEtag,
    enableGzip,
    excludePatterns,
    gzipMimeTypes,
    gzipMinBytes,
    includePatterns,
    logger,
    maxPreloadBytes,
    verbose,
    webDistPath,
  })

  return {
    fetchHandler: async (request: Request) => {
      try {
        return await handler.fetch(request)
      } catch (error) {
        logger.error(error as Error)
        return new Response('Internal Server Error', { status: 500 })
      }
    },
    routes,
  }
}
