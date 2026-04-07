/**
 * TanStack Start Production Server with Bun
 *
 * A high-performance production server for TanStack Start applications that
 * implements intelligent static asset loading with configurable memory management.
 *
 * Features:
 * - Hybrid loading strategy (preload small files, serve large files on-demand)
 * - Configurable file filtering with include/exclude patterns
 * - Memory-efficient response generation
 * - Production-ready caching headers
 *
 * Environment Variables:
 *
 * PORT (number)
 *   - Server port number
 *   - Default: 3000
 *
 * ASSET_PRELOAD_MAX_SIZE (number)
 *   - Maximum file size in bytes to preload into memory
 *   - Files larger than this will be served on-demand from disk
 *   - Default: 5242880 (5MB)
 *   - Example: ASSET_PRELOAD_MAX_SIZE=5242880 (5MB)
 *
 * ASSET_PRELOAD_INCLUDE_PATTERNS (string)
 *   - Comma-separated list of glob patterns for files to include
 *   - If specified, only matching files are eligible for preloading
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: ASSET_PRELOAD_INCLUDE_PATTERNS="*.js,*.css,*.woff2"
 *
 * ASSET_PRELOAD_EXCLUDE_PATTERNS (string)
 *   - Comma-separated list of glob patterns for files to exclude
 *   - Applied after include patterns
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: ASSET_PRELOAD_EXCLUDE_PATTERNS="*.map,*.txt"
 *
 * ASSET_PRELOAD_VERBOSE_LOGGING (boolean)
 *   - Enable detailed logging of loaded and skipped files
 *   - Default: false
 *   - Set to "true" to enable verbose output
 *
 * ASSET_PRELOAD_ENABLE_ETAG (boolean)
 *   - Enable ETag generation for preloaded assets
 *   - Default: true
 *   - Set to "false" to disable ETag support
 *
 * ASSET_PRELOAD_ENABLE_GZIP (boolean)
 *   - Enable Gzip compression for eligible assets
 *   - Default: true
 *   - Set to "false" to disable Gzip compression
 *
 * ASSET_PRELOAD_GZIP_MIN_SIZE (number)
 *   - Minimum file size in bytes required for Gzip compression
 *   - Files smaller than this will not be compressed
 *   - Default: 1024 (1KB)
 *
 * ASSET_PRELOAD_GZIP_MIME_TYPES (string)
 *   - Comma-separated list of MIME types eligible for Gzip compression
 *   - Supports partial matching for types ending with "/"
 *   - Default: text/,application/javascript,application/json,application/xml,image/svg+xml
 *
 * Usage:
 *   imported by apps/api/src/index.ts
 */

import { join, posix, relative, sep } from 'node:path'
import type { Logger } from '@tokengator/logger'

// Preloading configuration from environment variables
const MAX_PRELOAD_BYTES = Number(
  process.env.ASSET_PRELOAD_MAX_SIZE ?? 5 * 1024 * 1024, // 5MB default
)

// Parse comma-separated include patterns (no defaults)
const INCLUDE_PATTERNS = (process.env.ASSET_PRELOAD_INCLUDE_PATTERNS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((pattern: string) => convertGlobToRegExp(pattern))

// Parse comma-separated exclude patterns (no defaults)
const EXCLUDE_PATTERNS = (process.env.ASSET_PRELOAD_EXCLUDE_PATTERNS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((pattern: string) => convertGlobToRegExp(pattern))

// Verbose logging flag
const VERBOSE = process.env.ASSET_PRELOAD_VERBOSE_LOGGING === 'true'

// Optional ETag feature
const ENABLE_ETAG = (process.env.ASSET_PRELOAD_ENABLE_ETAG ?? 'true') === 'true'

// Optional Gzip feature
const ENABLE_GZIP = (process.env.ASSET_PRELOAD_ENABLE_GZIP ?? 'true') === 'true'
const GZIP_MIN_BYTES = Number(process.env.ASSET_PRELOAD_GZIP_MIN_SIZE ?? 1024) // 1KB
const GZIP_TYPES = (
  process.env.ASSET_PRELOAD_GZIP_MIME_TYPES ??
  'text/,application/javascript,application/json,application/xml,image/svg+xml'
)
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

/**
 * Convert a simple glob pattern to a regular expression
 * Supports * wildcard for matching any characters
 */
function convertGlobToRegExp(globPattern: string): RegExp {
  // Escape regex special chars except *, then replace * with .*
  const escapedPattern = globPattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escapedPattern}$`, 'i')
}

function isVersionedAsset(relativePath: string): boolean {
  const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath
  return /[-.](?=[A-Za-z0-9]{8,}\.[^.]+$)(?=[A-Za-z0-9]*\d)[A-Za-z0-9]+\.[^.]+$/i.test(fileName)
}

/**
 * Compute ETag for a given data buffer
 */
function computeEtag(data: Uint8Array): string {
  const hash = Bun.hash(data)
  return `W/"${hash.toString(16)}-${data.byteLength.toString()}"`
}

/**
 * Metadata for preloaded static assets
 */
interface AssetMetadata {
  route: string
  size: number
  type: string
}

/**
 * In-memory asset with ETag and Gzip support
 */
interface InMemoryAsset {
  raw: Uint8Array
  gz?: Uint8Array
  etag?: string
  type: string
  immutable: boolean
  size: number
}

/**
 * Result of static asset preloading process
 */
interface PreloadResult {
  routes: Record<string, (req: Request) => Response | Promise<Response>>
  loaded: AssetMetadata[]
  skipped: AssetMetadata[]
}

export interface StartWebOptions {
  logger: Logger
  webDistPath: string
}

/**
 * Check if a file is eligible for preloading based on configured patterns
 */
function isFileEligibleForPreloading(relativePath: string): boolean {
  const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath

  // If include patterns are specified, file must match at least one
  if (INCLUDE_PATTERNS.length > 0) {
    if (!INCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
      return false
    }
  }

  // If exclude patterns are specified, file must not match any
  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return false
  }

  return true
}

/**
 * Check if a MIME type is compressible
 */
function isMimeTypeCompressible(mimeType: string): boolean {
  return GZIP_TYPES.some((type) => (type.endsWith('/') ? mimeType.startsWith(type) : mimeType === type))
}

/**
 * Conditionally compress data based on size and MIME type
 */
function compressDataIfAppropriate(data: Uint8Array, mimeType: string): Uint8Array | undefined {
  if (!ENABLE_GZIP) return undefined
  if (data.byteLength < GZIP_MIN_BYTES) return undefined
  if (!isMimeTypeCompressible(mimeType)) return undefined
  try {
    return Bun.gzipSync(data.buffer as ArrayBuffer)
  } catch {
    return undefined
  }
}

/**
 * Load an asset from disk and apply shared response policy metadata
 */
async function loadAssetFromFile({
  filepath,
  relativePath,
  type,
}: {
  filepath: string
  relativePath: string
  type: string
}): Promise<InMemoryAsset> {
  const bytes = new Uint8Array(await Bun.file(filepath).arrayBuffer())
  return {
    etag: ENABLE_ETAG ? computeEtag(bytes) : undefined,
    gz: compressDataIfAppropriate(bytes, type),
    immutable: isVersionedAsset(relativePath),
    raw: bytes,
    size: bytes.byteLength,
    type,
  }
}

function normalizeEtag(etag: string): string {
  return etag.trim().replace(/^W\//i, '')
}

function requestAcceptsGzip(acceptEncoding: string | null): boolean {
  if (!acceptEncoding) return false

  return acceptEncoding
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .some((token) => {
      const [coding = '', ...parameters] = token.split(';').map((part) => part.trim())
      if (coding.toLowerCase() !== 'gzip') {
        return false
      }

      const quality = parameters.find((parameter) => parameter.startsWith('q='))
      if (!quality) {
        return true
      }

      const value = Number(quality.slice(2))
      return Number.isFinite(value) && value > 0
    })
}

function requestMatchesEtag(etag: string, ifNoneMatch: string | null): boolean {
  if (!ifNoneMatch) return false

  const trimmed = ifNoneMatch.trim()
  if (trimmed === '*') {
    return true
  }

  const normalizedEtag = normalizeEtag(etag)
  return trimmed
    .split(',')
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .some((candidate) => normalizeEtag(candidate) === normalizedEtag)
}

/**
 * Create response handler function with ETag and Gzip support
 */
function createAssetResponse(asset: InMemoryAsset, req: Request): Response {
  const shouldVaryOnEncoding = ENABLE_GZIP && !!asset.gz
  const headers: Record<string, string> = {
    'Cache-Control': asset.immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    'Content-Type': asset.type,
  }

  if (shouldVaryOnEncoding) {
    headers.Vary = 'Accept-Encoding'
  }

  if (ENABLE_ETAG && asset.etag) {
    const ifNoneMatch = req.headers.get('if-none-match')
    if (requestMatchesEtag(asset.etag, ifNoneMatch)) {
      const notModifiedHeaders: Record<string, string> = { ETag: asset.etag }
      if (shouldVaryOnEncoding) {
        notModifiedHeaders.Vary = 'Accept-Encoding'
      }
      return new Response(null, {
        headers: notModifiedHeaders,
        status: 304,
      })
    }
    headers.ETag = asset.etag
  }

  if (ENABLE_GZIP && asset.gz && requestAcceptsGzip(req.headers.get('accept-encoding'))) {
    headers['Content-Encoding'] = 'gzip'
    headers['Content-Length'] = String(asset.gz.byteLength)
    const gzCopy = new Uint8Array(asset.gz)
    return new Response(gzCopy, { headers, status: 200 })
  }

  headers['Content-Length'] = String(asset.raw.byteLength)
  const rawCopy = new Uint8Array(asset.raw)
  return new Response(rawCopy, { headers, status: 200 })
}

function createResponseHandler(asset: InMemoryAsset): (req: Request) => Response {
  return (req: Request) => createAssetResponse(asset, req)
}

function createStreamingAssetResponse({
  filepath,
  relativePath,
  type,
}: {
  filepath: string
  relativePath: string
  type: string
}): Response {
  return new Response(Bun.file(filepath), {
    headers: {
      'Cache-Control': isVersionedAsset(relativePath) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      'Content-Type': type,
    },
    status: 200,
  })
}

/**
 * Create scan glob pattern for client asset discovery
 */
function createCompositeGlobPattern(): Bun.Glob {
  return new Bun.Glob('**/*')
}

/**
 * Initialize static routes with intelligent preloading strategy
 * Small files are loaded into memory, large files are served on-demand
 */
async function initializeStaticRoutes({
  logger,
  webDistPath,
}: {
  logger: Logger
  webDistPath: string
}): Promise<PreloadResult> {
  const clientDirectory = join(webDistPath, 'client')
  const routes: Record<string, (req: Request) => Response | Promise<Response>> = {}
  const loaded: AssetMetadata[] = []
  const skipped: AssetMetadata[] = []

  logger.info(`Serving web app from ${relative(import.meta.dir, clientDirectory)}`)
  logger.info(`Loading static assets from ${relative(import.meta.dir, clientDirectory)}...`)
  if (VERBOSE) {
    logger.debug(`Max preload size: ${(MAX_PRELOAD_BYTES / 1024 / 1024).toFixed(2)} MB`)
    if (INCLUDE_PATTERNS.length > 0) {
      logger.debug(`Include patterns: ${process.env.ASSET_PRELOAD_INCLUDE_PATTERNS ?? ''}`)
    }
    if (EXCLUDE_PATTERNS.length > 0) {
      logger.debug(`Exclude patterns: ${process.env.ASSET_PRELOAD_EXCLUDE_PATTERNS ?? ''}`)
    }
  }

  let totalPreloadedBytes = 0

  try {
    const glob = createCompositeGlobPattern()
    for await (const relativePath of glob.scan({ cwd: clientDirectory })) {
      const filepath = join(clientDirectory, relativePath)
      const route = `/${relativePath.split(sep).join(posix.sep)}`

      try {
        // Get file metadata
        const file = Bun.file(filepath)

        // Skip if file doesn't exist or is empty
        if (!(await file.exists()) || file.size === 0) {
          continue
        }

        const metadata: AssetMetadata = {
          route,
          size: file.size,
          type: file.type || 'application/octet-stream',
        }

        // Determine if file should be preloaded
        const matchesPattern = isFileEligibleForPreloading(relativePath)
        const withinSizeLimit = file.size <= MAX_PRELOAD_BYTES

        if (matchesPattern && withinSizeLimit) {
          // Preload small files into memory with ETag and Gzip support
          const asset = await loadAssetFromFile({
            filepath,
            relativePath,
            type: metadata.type,
          })
          routes[route] = createResponseHandler(asset)

          loaded.push({ ...metadata, size: asset.size })
          totalPreloadedBytes += asset.size
        } else {
          // Serve filtered files with shared response policy and stream oversized files from disk
          routes[route] = withinSizeLimit
            ? async (req: Request) =>
                createAssetResponse(
                  await loadAssetFromFile({
                    filepath,
                    relativePath,
                    type: metadata.type,
                  }),
                  req,
                )
            : () =>
                createStreamingAssetResponse({
                  filepath,
                  relativePath,
                  type: metadata.type,
                })

          skipped.push(metadata)
        }
      } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'EISDIR') {
          logger.error(`Failed to load ${filepath}: ${error.message}`)
        }
      }
    }

    // Show detailed file overview only when verbose mode is enabled
    if (VERBOSE && (loaded.length > 0 || skipped.length > 0)) {
      const allFiles = [...loaded, ...skipped].sort((a, b) => a.route.localeCompare(b.route))

      // Calculate max path length for alignment
      const maxPathLength = Math.min(Math.max(...allFiles.map((f) => f.route.length)), 60)

      // Format file size with KB and actual gzip size
      const formatFileSize = (bytes: number, gzBytes?: number) => {
        const kb = bytes / 1024
        const sizeStr = kb < 100 ? kb.toFixed(2) : kb.toFixed(1)

        if (gzBytes !== undefined) {
          const gzKb = gzBytes / 1024
          const gzStr = gzKb < 100 ? gzKb.toFixed(2) : gzKb.toFixed(1)
          return {
            gzip: gzStr,
            size: sizeStr,
          }
        }

        // Rough gzip estimation (typically 30-70% compression) if no actual gzip data
        const gzipKb = kb * 0.35
        return {
          gzip: gzipKb < 100 ? gzipKb.toFixed(2) : gzipKb.toFixed(1),
          size: sizeStr,
        }
      }

      if (loaded.length > 0) {
        logger.debug('\n📁 Preloaded into memory:')
        logger.debug('Path                                          │    Size │ Gzip Size')
        loaded
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const { gzip, size } = formatFileSize(file.size)
            const paddedPath = file.route.padEnd(maxPathLength)
            const sizeStr = `${size.padStart(7)} kB`
            const gzipStr = `${gzip.padStart(7)} kB`
            logger.debug(`${paddedPath} │ ${sizeStr} │  ${gzipStr}`)
          })
      }

      if (skipped.length > 0) {
        logger.debug('\n💾 Served on-demand:')
        logger.debug('Path                                          │    Size │ Gzip Size')
        skipped
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const { gzip, size } = formatFileSize(file.size)
            const paddedPath = file.route.padEnd(maxPathLength)
            const sizeStr = `${size.padStart(7)} kB`
            const gzipStr = `${gzip.padStart(7)} kB`
            logger.debug(`${paddedPath} │ ${sizeStr} │  ${gzipStr}`)
          })
      }
    }

    // Show detailed verbose info if enabled
    if (VERBOSE) {
      if (loaded.length > 0 || skipped.length > 0) {
        const allFiles = [...loaded, ...skipped].sort((a, b) => a.route.localeCompare(b.route))
        logger.debug('\n📊 Detailed file information:')
        logger.debug('Status       │ Path                            │ MIME Type                    │ Reason')
        allFiles.forEach((file) => {
          const isPreloaded = loaded.includes(file)
          const status = isPreloaded ? 'MEMORY' : 'ON-DEMAND'
          const reason =
            !isPreloaded && file.size > MAX_PRELOAD_BYTES ? 'too large' : !isPreloaded ? 'filtered' : 'preloaded'
          const route = file.route.length > 30 ? file.route.substring(0, 27) + '...' : file.route
          logger.debug(`${status.padEnd(12)} │ ${route.padEnd(30)} │ ${file.type.padEnd(28)} │ ${reason.padEnd(10)}`)
        })
      } else {
        logger.debug('\n📊 No files found to display')
      }
    }

    if (loaded.length > 0) {
      logger.info(
        `Preloaded ${String(loaded.length)} files (${(totalPreloadedBytes / 1024 / 1024).toFixed(2)} MB) into memory`,
      )
    } else {
      logger.info('No files preloaded into memory')
    }

    if (skipped.length > 0) {
      const tooLarge = skipped.filter((f) => f.size > MAX_PRELOAD_BYTES).length
      const filtered = skipped.length - tooLarge
      logger.info(
        `${String(skipped.length)} files will be served on-demand (${String(tooLarge)} too large, ${String(filtered)} filtered)`,
      )
    }
  } catch (error) {
    logger.error(`Failed to load static files from ${clientDirectory}: ${String(error)}`)
  }

  return { loaded, routes, skipped }
}

async function initializeHandler({
  logger,
  webDistPath,
}: StartWebOptions): Promise<{ fetch: (request: Request) => Response | Promise<Response> }> {
  const serverEntryPoint = join(webDistPath, 'server/server.js')

  if (!(await Bun.file(serverEntryPoint).exists())) {
    logger.info(`Skipping web bootstrap because ${relative(import.meta.dir, serverEntryPoint)} is missing`)
    return {
      fetch: async () => new Response('Not Found', { status: 404 }),
    }
  }

  logger.info(`Loading application handler ${relative(import.meta.dir, serverEntryPoint)}`)
  try {
    const serverModule = (await import(serverEntryPoint)) as {
      default: { fetch: (request: Request) => Response | Promise<Response> }
    }
    return serverModule.default
  } catch (error) {
    throw new Error(`Failed to load server handler: ${String(error)}`)
  }
}
export async function createWebServeConfig({ logger, webDistPath }: StartWebOptions) {
  logger.debug('Starting web server')

  // Load TanStack Start server handler
  const handler = await initializeHandler({ logger, webDistPath })
  logger.debug('TanStack Start application handler initialized')

  // Build static routes with intelligent preloading
  const { routes } = await initializeStaticRoutes({ logger, webDistPath })

  return {
    fetchHandler: async (req: Request) => {
      try {
        return await handler.fetch(req)
      } catch (error) {
        logger.error(error as Error)
        return new Response('Internal Server Error', { status: 500 })
      }
    },
    routes,
  }
}
