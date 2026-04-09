import { join, relative } from 'node:path'
import type { Logger } from './logger'

export interface ServerHandler {
  fetch: (request: Request) => Response | Promise<Response>
}

export interface InitializeServerHandlerOptions {
  logger: Logger
  webDistPath: string
}

export async function initializeServerHandler({
  logger,
  webDistPath,
}: InitializeServerHandlerOptions): Promise<ServerHandler> {
  const serverEntryPoint = join(webDistPath, 'server/server.js')
  const displayPath = relative(process.cwd(), serverEntryPoint) || serverEntryPoint

  if (!(await Bun.file(serverEntryPoint).exists())) {
    logger.info(`Skipping web bootstrap because ${displayPath} is missing`)
    return {
      fetch: async () => new Response('Not Found', { status: 404 }),
    }
  }

  logger.info(`Loading application handler ${displayPath}`)

  try {
    const serverModule = (await import(serverEntryPoint)) as {
      default: ServerHandler
    }

    return serverModule.default
  } catch (error) {
    throw new Error(`Failed to load server handler: ${String(error)}`)
  }
}
