import { join, posix, relative, sep } from 'node:path'
import type { Logger } from './logger'

export interface AssetMetadata {
  route: string
  size: number
  type: string
}

interface InMemoryAsset {
  etag?: string
  gz?: Uint8Array
  immutable: boolean
  raw: Uint8Array
  size: number
  type: string
}

export interface InitializeStaticRoutesOptions {
  enableEtag: boolean
  enableGzip: boolean
  excludePatterns: string[]
  gzipMimeTypes: string[]
  gzipMinBytes: number
  includePatterns: string[]
  logger: Logger
  maxPreloadBytes: number
  verbose: boolean
  webDistPath: string
}

export interface PreloadResult {
  loaded: AssetMetadata[]
  routes: Record<string, StaticAssetRouteHandler>
  skipped: AssetMetadata[]
}

export type StaticAssetRouteHandler = (request: Request) => Response | Promise<Response>

const ASSET_GLOB = new Bun.Glob('**/*')

function compressDataIfAppropriate({
  data,
  enableGzip,
  gzipMimeTypes,
  gzipMinBytes,
  mimeType,
}: {
  data: Uint8Array
  enableGzip: boolean
  gzipMimeTypes: string[]
  gzipMinBytes: number
  mimeType: string
}): Uint8Array | undefined {
  if (!enableGzip) {
    return undefined
  }

  if (data.byteLength < gzipMinBytes) {
    return undefined
  }

  if (!isMimeTypeCompressible(gzipMimeTypes, mimeType)) {
    return undefined
  }

  try {
    return Bun.gzipSync(data.buffer as ArrayBuffer)
  } catch {
    return undefined
  }
}

function computeEtag(data: Uint8Array): string {
  const hash = Bun.hash(data)
  return `W/"${hash.toString(16)}-${data.byteLength.toString()}"`
}

function convertGlobToRegExp(globPattern: string): RegExp {
  const escapedPattern = globPattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escapedPattern}$`, 'i')
}

function createAssetResponse({
  asset,
  enableEtag,
  enableGzip,
  request,
}: {
  asset: InMemoryAsset
  enableEtag: boolean
  enableGzip: boolean
  request: Request
}): Response {
  const headers: Record<string, string> = {
    'Cache-Control': asset.immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    'Content-Type': asset.type,
  }
  const shouldVaryOnEncoding = enableGzip && !!asset.gz

  if (shouldVaryOnEncoding) {
    headers.Vary = 'Accept-Encoding'
  }

  if (enableEtag && asset.etag) {
    const ifNoneMatch = request.headers.get('if-none-match')

    if (requestMatchesEtag(asset.etag, ifNoneMatch)) {
      const notModifiedHeaders: Record<string, string> = {
        ETag: asset.etag,
      }

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

  if (enableGzip && asset.gz && requestAcceptsGzip(request.headers.get('accept-encoding'))) {
    headers['Content-Encoding'] = 'gzip'
    headers['Content-Length'] = String(asset.gz.byteLength)
    return new Response(new Uint8Array(asset.gz), {
      headers,
      status: 200,
    })
  }

  headers['Content-Length'] = String(asset.raw.byteLength)
  return new Response(new Uint8Array(asset.raw), {
    headers,
    status: 200,
  })
}

function createResponseHandler({
  asset,
  enableEtag,
  enableGzip,
}: {
  asset: InMemoryAsset
  enableEtag: boolean
  enableGzip: boolean
}): StaticAssetRouteHandler {
  return (request) =>
    createAssetResponse({
      asset,
      enableEtag,
      enableGzip,
      request,
    })
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

function formatFileSize(bytes: number, gzBytes?: number) {
  const kb = bytes / 1024
  const size = kb < 100 ? kb.toFixed(2) : kb.toFixed(1)

  if (gzBytes !== undefined) {
    const gzipKb = gzBytes / 1024
    return {
      gzip: gzipKb < 100 ? gzipKb.toFixed(2) : gzipKb.toFixed(1),
      size,
    }
  }

  const estimatedGzipKb = kb * 0.35
  return {
    gzip: estimatedGzipKb < 100 ? estimatedGzipKb.toFixed(2) : estimatedGzipKb.toFixed(1),
    size,
  }
}

export async function initializeStaticRoutes({
  enableEtag,
  enableGzip,
  excludePatterns: excludePatternValues,
  gzipMimeTypes,
  gzipMinBytes,
  includePatterns: includePatternValues,
  logger,
  maxPreloadBytes,
  verbose,
  webDistPath,
}: InitializeStaticRoutesOptions): Promise<PreloadResult> {
  const clientDirectory = join(webDistPath, 'client')
  const displayPath = relative(process.cwd(), clientDirectory) || clientDirectory
  const excludePatterns = excludePatternValues.map((pattern) => convertGlobToRegExp(pattern))
  const includePatterns = includePatternValues.map((pattern) => convertGlobToRegExp(pattern))
  const loaded: AssetMetadata[] = []
  const routes: Record<string, StaticAssetRouteHandler> = {}
  const skipped: AssetMetadata[] = []

  logger.info(`Serving web app from ${displayPath}`)
  logger.info(`Loading static assets from ${displayPath}...`)

  if (verbose) {
    logger.debug(`Max preload size: ${(maxPreloadBytes / 1024 / 1024).toFixed(2)} MB`)

    if (includePatternValues.length > 0) {
      logger.debug(`Include patterns: ${includePatternValues.join(',')}`)
    }

    if (excludePatternValues.length > 0) {
      logger.debug(`Exclude patterns: ${excludePatternValues.join(',')}`)
    }
  }

  let totalPreloadedBytes = 0

  try {
    for await (const relativePath of ASSET_GLOB.scan({ cwd: clientDirectory })) {
      const filepath = join(clientDirectory, relativePath)
      const route = `/${relativePath.split(sep).join(posix.sep)}`

      try {
        const file = Bun.file(filepath)

        if (!(await file.exists()) || file.size === 0) {
          continue
        }

        const metadata: AssetMetadata = {
          route,
          size: file.size,
          type: file.type || 'application/octet-stream',
        }
        const matchesPattern = isFileEligibleForPreloading(relativePath, excludePatterns, includePatterns)
        const withinSizeLimit = file.size <= maxPreloadBytes

        if (matchesPattern && withinSizeLimit) {
          const asset = await loadAssetFromFile({
            enableEtag,
            enableGzip,
            filepath,
            gzipMimeTypes,
            gzipMinBytes,
            relativePath,
            type: metadata.type,
          })

          loaded.push({ ...metadata, size: asset.size })
          routes[route] = createResponseHandler({
            asset,
            enableEtag,
            enableGzip,
          })
          totalPreloadedBytes += asset.size
          continue
        }

        routes[route] = withinSizeLimit
          ? async (request) =>
              createAssetResponse({
                asset: await loadAssetFromFile({
                  enableEtag,
                  enableGzip,
                  filepath,
                  gzipMimeTypes,
                  gzipMinBytes,
                  relativePath,
                  type: metadata.type,
                }),
                enableEtag,
                enableGzip,
                request,
              })
          : () =>
              createStreamingAssetResponse({
                filepath,
                relativePath,
                type: metadata.type,
              })

        skipped.push(metadata)
      } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'EISDIR') {
          logger.error(`Failed to load ${filepath}: ${error.message}`)
        }
      }
    }

    if (verbose && (loaded.length > 0 || skipped.length > 0)) {
      const allFiles = [...loaded, ...skipped].sort((left, right) => left.route.localeCompare(right.route))
      const maxPathLength = Math.min(Math.max(...allFiles.map((file) => file.route.length)), 60)

      if (loaded.length > 0) {
        logger.debug('\nPreloaded into memory:')
        logger.debug('Path                                          │    Size │ Gzip Size')

        loaded
          .sort((left, right) => left.route.localeCompare(right.route))
          .forEach((file) => {
            const { gzip, size } = formatFileSize(file.size)
            const gzipSize = `${gzip.padStart(7)} kB`
            const paddedPath = file.route.padEnd(maxPathLength)
            const sizeValue = `${size.padStart(7)} kB`

            logger.debug(`${paddedPath} │ ${sizeValue} │  ${gzipSize}`)
          })
      }

      if (skipped.length > 0) {
        logger.debug('\nServed on-demand:')
        logger.debug('Path                                          │    Size │ Gzip Size')

        skipped
          .sort((left, right) => left.route.localeCompare(right.route))
          .forEach((file) => {
            const { gzip, size } = formatFileSize(file.size)
            const gzipSize = `${gzip.padStart(7)} kB`
            const paddedPath = file.route.padEnd(maxPathLength)
            const sizeValue = `${size.padStart(7)} kB`

            logger.debug(`${paddedPath} │ ${sizeValue} │  ${gzipSize}`)
          })
      }
    }

    if (verbose) {
      if (loaded.length > 0 || skipped.length > 0) {
        const allFiles = [...loaded, ...skipped].sort((left, right) => left.route.localeCompare(right.route))

        logger.debug('\nDetailed file information:')
        logger.debug('Status       │ Path                            │ MIME Type                    │ Reason')

        allFiles.forEach((file) => {
          const isPreloaded = loaded.includes(file)
          const reason =
            !isPreloaded && file.size > maxPreloadBytes ? 'too large' : !isPreloaded ? 'filtered' : 'preloaded'
          const route = file.route.length > 30 ? `${file.route.slice(0, 27)}...` : file.route
          const status = isPreloaded ? 'MEMORY' : 'ON-DEMAND'

          logger.debug(`${status.padEnd(12)} │ ${route.padEnd(30)} │ ${file.type.padEnd(28)} │ ${reason.padEnd(10)}`)
        })
      } else {
        logger.debug('\nNo files found to display')
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
      const tooLarge = skipped.filter((file) => file.size > maxPreloadBytes).length
      const filtered = skipped.length - tooLarge

      logger.info(
        `${String(skipped.length)} files will be served on-demand (${String(tooLarge)} too large, ${String(filtered)} filtered)`,
      )
    }
  } catch (error) {
    logger.error(`Failed to load static files from ${clientDirectory}: ${String(error)}`)
  }

  return {
    loaded,
    routes,
    skipped,
  }
}

function isFileEligibleForPreloading(relativePath: string, excludePatterns: RegExp[], includePatterns: RegExp[]) {
  const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath

  if (includePatterns.length > 0 && !includePatterns.some((pattern) => pattern.test(fileName))) {
    return false
  }

  if (excludePatterns.some((pattern) => pattern.test(fileName))) {
    return false
  }

  return true
}

function isMimeTypeCompressible(gzipMimeTypes: string[], mimeType: string): boolean {
  return gzipMimeTypes.some((type) => (type.endsWith('/') ? mimeType.startsWith(type) : mimeType === type))
}

function isVersionedAsset(relativePath: string): boolean {
  const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath
  return /[-.](?=[A-Za-z0-9]{8,}\.[^.]+$)(?=[A-Za-z0-9]*\d)[A-Za-z0-9]+\.[^.]+$/i.test(fileName)
}

async function loadAssetFromFile({
  enableEtag,
  enableGzip,
  filepath,
  gzipMimeTypes,
  gzipMinBytes,
  relativePath,
  type,
}: {
  enableEtag: boolean
  enableGzip: boolean
  filepath: string
  gzipMimeTypes: string[]
  gzipMinBytes: number
  relativePath: string
  type: string
}): Promise<InMemoryAsset> {
  const raw = new Uint8Array(await Bun.file(filepath).arrayBuffer())

  return {
    etag: enableEtag ? computeEtag(raw) : undefined,
    gz: compressDataIfAppropriate({
      data: raw,
      enableGzip,
      gzipMimeTypes,
      gzipMinBytes,
      mimeType: type,
    }),
    immutable: isVersionedAsset(relativePath),
    raw,
    size: raw.byteLength,
    type,
  }
}

function normalizeEtag(etag: string): string {
  return etag.trim().replace(/^W\//i, '')
}

function requestAcceptsGzip(acceptEncoding: string | null): boolean {
  if (!acceptEncoding) {
    return false
  }

  const encodings = acceptEncoding
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [coding = '', ...parameters] = token.split(';').map((part) => part.trim())
      const quality = parameters.find((parameter) => parameter.startsWith('q='))
      const value = quality ? Number(quality.slice(2)) : 1

      return {
        coding: coding.toLowerCase(),
        value: Number.isFinite(value) ? value : 0,
      }
    })

  if (encodings.some(({ coding, value }) => coding === 'gzip' && value > 0)) {
    return true
  }

  return (
    !encodings.some(({ coding, value }) => coding === 'gzip' && value === 0) &&
    encodings.some(({ coding, value }) => coding === '*' && value > 0)
  )
}

function requestMatchesEtag(etag: string, ifNoneMatch: string | null): boolean {
  if (!ifNoneMatch) {
    return false
  }

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
