import type { ResolverContext, ResolverInput, ResolverPage, ResolverResult } from './types'

export interface ResolverDefinition<TConfig = unknown, TItem = unknown> {
  kind: string
  resolve(input: {
    context: ResolverContext
    onPage: (page: ResolverPage<TItem>) => Promise<boolean> | boolean
    resolver: ResolverInput<TConfig>
  }): Promise<ResolverResult>
}

export function defineResolver<TConfig = unknown, TItem = unknown>(
  resolver: ResolverDefinition<TConfig, TItem>,
): ResolverDefinition<TConfig, TItem> {
  return resolver
}
