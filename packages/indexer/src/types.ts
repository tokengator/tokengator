export interface ResolverContext {
  logger?: Partial<Pick<Console, 'debug' | 'error' | 'info' | 'warn'>>
  signal?: AbortSignal
}

export interface ResolverInput<TConfig = unknown> {
  config: TConfig
  id: string
  kind: string
}

export interface ResolverPage<TItem = unknown> {
  items: TItem[]
  page: number
}

export interface ResolverResult {
  errors: string[]
  pages: number
  total: number
}
