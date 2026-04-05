import { createHelius, type HeliusRpcOptions } from 'helius-sdk'
import { getAppLogger } from '@tokengator/logger'

import type { HeliusAdapter } from '../resolvers/helius'
import { ProviderError, type ProviderErrorCode } from '../errors'

const logger = getAppLogger('indexer', 'helius-adapter')

export interface CreateHeliusSdkAdapterOptions extends HeliusRequestLimiterOptions {
  apiKey: string
  baseUrl?: HeliusRpcOptions['baseUrl']
  network?: HeliusRpcOptions['network']
  rebateAddress?: HeliusRpcOptions['rebateAddress']
  retry?: HeliusRetryOptions
  userAgent?: HeliusRpcOptions['userAgent']
}

export interface HeliusClientSubset {
  getAssetsByGroup(input: {
    after?: string
    groupKey: string
    groupValue: string
    limit?: number
    page?: number
  }): Promise<{ cursor?: string; items?: unknown[] }>

  getTokenAccounts(input: {
    cursor?: string
    limit?: number
    mint?: string
    page?: number
  }): Promise<{ cursor?: string; token_accounts?: unknown[] }>
}

export interface HeliusRequestLimiterOptions {
  rpsLimit?: number
}

export interface HeliusRetryOptions {
  attempts?: number
  baseDelayMs?: number
  jitterRatio?: number
  maxDelayMs?: number
}

interface AdapterRuntimeOptions {
  random: () => number
  retry: Required<HeliusRetryOptions>
  sleep: (ms: number) => Promise<void>
  waitForRateLimit: () => Promise<void>
}

interface CreateHeliusAdapterFromClientOptions extends HeliusRequestLimiterOptions {
  random?: () => number
  retry?: HeliusRetryOptions
  sleep?: (ms: number) => Promise<void>
}

const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 150
const DEFAULT_RETRY_JITTER_RATIO = 0.2
const DEFAULT_RETRY_MAX_DELAY_MS = 1_500

const TRANSIENT_NETWORK_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENETDOWN',
  'ENETUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
])

/**
 * Create a Tokengator Helius adapter backed by the latest `helius-sdk` client.
 */
export function createHeliusSdkAdapter(options: CreateHeliusSdkAdapterOptions): HeliusAdapter {
  const client = createHelius(options)

  return createHeliusAdapterFromClient(client, {
    retry: options.retry,
    rpsLimit: options.rpsLimit,
  })
}

/**
 * Adapt an existing Helius client instance to Tokengator's provider contract.
 *
 * Useful for tests, dependency injection, or custom client factories.
 */
export function createHeliusAdapterFromClient(
  client: HeliusClientSubset,
  options: CreateHeliusAdapterFromClientOptions = {},
): HeliusAdapter {
  const runtime = createRuntimeOptions(options)

  return {
    async getAssetsByCollection({ collection, cursor, limit, page }) {
      const params = {
        groupKey: 'collection',
        groupValue: collection,
        limit,
        ...(cursor ? { after: cursor } : { page }),
      }

      const response = await withRetry(async () => {
        return await performRequest(
          'getAssetsByGroup',
          params,
          async () => await client.getAssetsByGroup(params),
          runtime,
        )
      }, runtime)

      const items = expectArray(response.items, 'getAssetsByGroup.items')
      const nextCursor = expectOptionalString(response.cursor, 'getAssetsByGroup.cursor')

      return {
        cursor: nextCursor,
        items,
      }
    },

    async getTokenAccounts({ cursor, limit, mint, page }) {
      const params = {
        limit,
        mint,
        ...(cursor ? { cursor } : { page }),
      }

      const response = await withRetry(async () => {
        return await performRequest(
          'getTokenAccounts',
          params,
          async () => await client.getTokenAccounts(params),
          runtime,
        )
      }, runtime)

      const items = expectArray(response.token_accounts, 'getTokenAccounts.token_accounts')
      const nextCursor = expectOptionalString(response.cursor, 'getTokenAccounts.cursor')

      return {
        cursor: nextCursor,
        items,
      }
    },
  }
}

function calculateBackoffDelayMs(attempt: number, runtime: AdapterRuntimeOptions): number {
  const exponential = runtime.retry.baseDelayMs * 2 ** (attempt - 1)
  const boundedDelay = Math.min(exponential, runtime.retry.maxDelayMs)

  if (boundedDelay === 0 || runtime.retry.jitterRatio === 0) {
    return boundedDelay
  }

  const jitterWindow = boundedDelay * runtime.retry.jitterRatio
  const randomOffset = runtime.random() * jitterWindow

  return Math.floor(Math.max(0, boundedDelay - jitterWindow / 2 + randomOffset))
}

function calculateRetryDelayMs(error: ProviderError, attempt: number, runtime: AdapterRuntimeOptions): number {
  const calculated = calculateBackoffDelayMs(attempt, runtime)
  const retryAfterMs = error.metadata?.retryAfterMs

  if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs)) {
    return Math.max(calculated, Math.max(0, Math.floor(retryAfterMs)))
  }

  return calculated
}

function createHttpProviderError(
  code: ProviderErrorCode,
  status: number,
  error: unknown,
  attempt: number,
  retryable: boolean,
): ProviderError {
  return new ProviderError({
    cause: error,
    code,
    message: formatMessage(error, `Helius request failed with status ${status}`),
    metadata: {
      attempts: attempt,
      retryAfterMs: getRetryAfterMs(error),
      status,
    },
    provider: 'helius',
    retryable,
  })
}

function createRuntimeOptions(options: CreateHeliusAdapterFromClientOptions): AdapterRuntimeOptions {
  const attempts = options.retry?.attempts ?? DEFAULT_RETRY_ATTEMPTS
  const baseDelayMs = options.retry?.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS
  const jitterRatio = options.retry?.jitterRatio ?? DEFAULT_RETRY_JITTER_RATIO
  const maxDelayMs = options.retry?.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS
  const rpsLimit = Math.max(0, options.rpsLimit ?? 0)
  const minIntervalMs = rpsLimit > 0 ? 1000 / rpsLimit : 0

  let nextRequestAt = 0
  let rateLimitQueue = Promise.resolve()

  const waitForRateLimit = async () => {
    if (minIntervalMs <= 0) {
      return
    }

    const scheduled = rateLimitQueue.then(async () => {
      const now = Date.now()
      const waitMs = Math.max(0, nextRequestAt - now)
      nextRequestAt = Math.max(nextRequestAt, now) + minIntervalMs

      if (waitMs > 0) {
        await (options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(waitMs)
      }
    })

    rateLimitQueue = scheduled.catch(() => {
      // keep queue alive
    })

    await scheduled
  }

  return {
    random: options.random ?? Math.random,
    retry: {
      attempts: Math.max(1, Math.floor(attempts)),
      baseDelayMs: Math.max(0, baseDelayMs),
      jitterRatio: Math.max(0, jitterRatio),
      maxDelayMs: Math.max(0, maxDelayMs),
    },
    sleep: options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
    waitForRateLimit,
  }
}

function expectArray(value: unknown, field: string): unknown[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new ProviderError({
      code: 'invalid_response',
      message: `Invalid Helius response: ${field} must be an array`,
      metadata: {
        field,
      },
      provider: 'helius',
      retryable: false,
    })
  }

  return value
}

function expectOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new ProviderError({
      code: 'invalid_response',
      message: `Invalid Helius response: ${field} must be a string when present`,
      metadata: {
        field,
      },
      provider: 'helius',
      retryable: false,
    })
  }

  return value
}

function formatMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const code = Reflect.get(error, 'code')
  if (typeof code === 'string') {
    return code
  }

  const cause = Reflect.get(error, 'cause')
  if (cause && typeof cause === 'object') {
    const causeCode = Reflect.get(cause, 'code')
    if (typeof causeCode === 'string') {
      return causeCode
    }
  }

  return undefined
}

function getRetryAfterMs(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const retryAfter = Reflect.get(error, 'retryAfter')
  if (typeof retryAfter === 'number') {
    return retryAfter
  }

  const response = Reflect.get(error, 'response')
  if (!response || typeof response !== 'object') {
    return undefined
  }

  const headers = Reflect.get(response, 'headers')
  if (!headers || typeof headers !== 'object') {
    return undefined
  }

  const getHeader = Reflect.get(headers, 'get')
  const raw =
    typeof getHeader === 'function' ? getHeader.call(headers, 'retry-after') : Reflect.get(headers, 'retry-after')

  if (typeof raw !== 'string') {
    return undefined
  }

  const seconds = Number.parseFloat(raw)
  if (!Number.isFinite(seconds)) {
    return undefined
  }

  return Math.max(0, Math.floor(seconds * 1000))
}

function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const status = Reflect.get(error, 'status')
  if (typeof status === 'number') {
    return status
  }

  const response = Reflect.get(error, 'response')
  if (response && typeof response === 'object') {
    const responseStatus = Reflect.get(response, 'status')
    if (typeof responseStatus === 'number') {
      return responseStatus
    }
  }

  return undefined
}

function isNetworkError(error: unknown): boolean {
  const code = getErrorCode(error)
  if (code && TRANSIENT_NETWORK_ERROR_CODES.has(code)) {
    return true
  }

  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return true
  }

  return false
}

async function performRequest<T>(
  method: string,
  params: unknown,
  request: () => Promise<T>,
  runtime: AdapterRuntimeOptions,
): Promise<T> {
  await runtime.waitForRateLimit()

  const startedAt = Date.now()

  try {
    const response = await request()

    logger.debug('[helius-adapter] method={method} durationMs={durationMs} outcome=success params={params}', () => ({
      durationMs: Date.now() - startedAt,
      method,
      params: safeJson(params),
    }))

    return response
  } catch (error) {
    logger.debug(
      '[helius-adapter] method={method} durationMs={durationMs} outcome=failure params={params} error={error}',
      () => ({
        durationMs: Date.now() - startedAt,
        error: formatMessage(error, 'unknown error'),
        method,
        params: safeJson(params),
      }),
    )

    throw error
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return '[unserializable]'
  }
}

function toHeliusProviderError(error: unknown, attempt: number): ProviderError {
  if (error instanceof ProviderError) {
    return new ProviderError({
      cause: error.cause,
      code: error.code,
      message: error.message,
      metadata: {
        ...error.metadata,
        attempts: attempt,
      },
      provider: error.provider,
      retryable: error.retryable,
    })
  }

  const status = getStatusCode(error)
  if (status === 429) {
    return createHttpProviderError('http_429', status, error, attempt, true)
  }

  if (status !== undefined && status >= 500 && status <= 599) {
    return createHttpProviderError('http_5xx', status, error, attempt, true)
  }

  if (isNetworkError(error)) {
    return new ProviderError({
      cause: error,
      code: 'network_error',
      message: formatMessage(error, 'Helius network request failed'),
      metadata: {
        attempts: attempt,
        code: getErrorCode(error),
      },
      provider: 'helius',
      retryable: true,
    })
  }

  return new ProviderError({
    cause: error,
    code: 'provider_error',
    message: formatMessage(error, 'Helius request failed'),
    metadata: {
      attempts: attempt,
      status,
    },
    provider: 'helius',
    retryable: false,
  })
}

async function withRetry<T>(request: () => Promise<T>, runtime: AdapterRuntimeOptions): Promise<T> {
  let lastError: ProviderError | undefined

  for (let attempt = 1; attempt <= runtime.retry.attempts; attempt += 1) {
    try {
      return await request()
    } catch (error) {
      const providerError = toHeliusProviderError(error, attempt)
      lastError = providerError

      const shouldRetry = providerError.retryable && attempt < runtime.retry.attempts
      if (!shouldRetry) {
        throw providerError
      }

      const delayMs = calculateRetryDelayMs(providerError, attempt, runtime)
      await runtime.sleep(delayMs)
    }
  }

  throw (
    lastError ??
    new ProviderError({
      code: 'provider_error',
      message: 'Helius request failed without error details',
      metadata: {
        attempts: runtime.retry.attempts,
      },
      provider: 'helius',
      retryable: false,
    })
  )
}
