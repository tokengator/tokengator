import type { ResolverContext, ResolverResult } from '../types'
import { ProviderError } from '../errors'
import { defineResolver, type ResolverDefinition } from '../resolver'

export interface HeliusAdapter {
  getAssetsByCollection(input: {
    collection: string
    cursor?: string
    limit: number
    page: number
  }): Promise<HeliusPageResponse>

  getTokenAccounts(input: { cursor?: string; limit: number; mint: string; page: number }): Promise<HeliusPageResponse>
}

export interface HeliusCollectionConfig {
  collection: string
  limit?: number
}

export interface HeliusPageResponse {
  cursor?: string
  items: unknown[]
}

export interface HeliusTokenAccountsConfig {
  limit?: number
  mint: string
}

export const HELIUS_COLLECTION_ASSETS = 'helius-collection-assets'
export const HELIUS_TOKEN_ACCOUNTS = 'helius-token-accounts'
export const RESOLVER_KINDS = [HELIUS_COLLECTION_ASSETS, HELIUS_TOKEN_ACCOUNTS] as const
export type ResolverKind = (typeof RESOLVER_KINDS)[number]

const DEFAULT_PAGE_LIMIT = 1000

export function createHeliusResolvers(adapter: HeliusAdapter): ResolverDefinition[] {
  return [
    defineResolver<HeliusCollectionConfig>({
      kind: HELIUS_COLLECTION_ASSETS,
      async resolve({ context, onPage, resolver }) {
        return await paginateWithCursor({
          context,
          fetchPage: async ({ cursor, limit, page }) => {
            return await adapter.getAssetsByCollection({
              collection: resolver.config.collection,
              cursor,
              limit,
              page,
            })
          },
          limit: resolver.config.limit ?? DEFAULT_PAGE_LIMIT,
          onPage,
          resolverId: resolver.id,
          resolverKind: HELIUS_COLLECTION_ASSETS,
        })
      },
    }),

    defineResolver<HeliusTokenAccountsConfig>({
      kind: HELIUS_TOKEN_ACCOUNTS,
      async resolve({ context, onPage, resolver }) {
        return await paginateWithCursor({
          context,
          fetchPage: async ({ cursor, limit, page }) => {
            return await adapter.getTokenAccounts({
              cursor,
              limit,
              mint: resolver.config.mint,
              page,
            })
          },
          limit: resolver.config.limit ?? DEFAULT_PAGE_LIMIT,
          onPage,
          resolverId: resolver.id,
          resolverKind: HELIUS_TOKEN_ACCOUNTS,
        })
      },
    }),
  ]
}

async function paginateWithCursor(input: {
  context: ResolverContext
  fetchPage: (input: { cursor?: string; limit: number; page: number }) => Promise<HeliusPageResponse>
  limit: number
  onPage: (page: { items: unknown[]; page: number }) => Promise<boolean> | boolean
  resolverId: string
  resolverKind: string
}): Promise<ResolverResult> {
  let cursor: string | undefined
  let page = 1
  let pages = 0
  let total = 0
  const resolverLabel = `${input.resolverKind}:${input.resolverId}`

  while (true) {
    assertNotAborted(input.context.signal)

    input.context.logger?.debug?.(`[${resolverLabel}] fetching page=${page} cursor=${cursor ?? 'none'}`)

    const response = await input.fetchPage({
      cursor,
      limit: input.limit,
      page,
    })

    const items = response.items ?? []
    if (items.length === 0) {
      input.context.logger?.debug?.(`[${resolverLabel}] stopping: empty page ${page}`)
      break
    }

    assertNotAborted(input.context.signal)

    const shouldContinue = await input.onPage({
      items,
      page,
    })

    pages += 1
    total += items.length

    if (!shouldContinue) {
      input.context.logger?.debug?.(`[${resolverLabel}] stopping: onPage returned false at page ${page}`)
      break
    }

    const hasNextCursor =
      typeof response.cursor === 'string' && response.cursor.length > 0 && response.cursor !== cursor
    const hasNextPage = !response.cursor && items.length >= input.limit

    if (!hasNextCursor && !hasNextPage) {
      input.context.logger?.debug?.(`[${resolverLabel}] stopping: cursor/limit boundary at page ${page}`)
      break
    }

    cursor = hasNextCursor ? response.cursor : undefined
    page += 1
  }

  return {
    errors: [],
    pages,
    total,
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return
  }

  throw new ProviderError({
    code: 'provider_error',
    message: 'Resolver aborted by signal',
    metadata: {
      reason: 'aborted',
    },
    provider: 'helius',
    retryable: false,
  })
}
