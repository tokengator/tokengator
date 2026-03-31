export interface ProviderErrorInit {
  cause?: unknown
  code: ProviderErrorCode
  message: string
  metadata?: ProviderErrorMetadata
  provider: ProviderName
  retryable: boolean
}

export interface ProviderErrorMetadata {
  attempts?: number
  field?: string
  retryAfterMs?: number
  status?: number
  [key: string]: unknown
}

export type ProviderErrorCode = 'http_429' | 'http_5xx' | 'invalid_response' | 'network_error' | 'provider_error'

export type ProviderName = 'helius'

export class ProviderError extends Error {
  public readonly code: ProviderErrorCode
  public readonly metadata?: ProviderErrorMetadata
  public readonly provider: ProviderName
  public readonly retryable: boolean

  public constructor(input: ProviderErrorInit) {
    super(input.message, { cause: input.cause })

    this.name = 'ProviderError'
    this.code = input.code
    this.metadata = input.metadata
    this.provider = input.provider
    this.retryable = input.retryable
  }
}

export function isProviderError(value: unknown): value is ProviderError {
  return value instanceof ProviderError
}
