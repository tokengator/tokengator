import type { ResolverDefinition } from './resolver'
import type { ResolverContext, ResolverInput, ResolverResult } from './types'

export interface ResolveOneOptions<TItem = unknown> {
  context?: ResolverContext
  input: ResolverInput
  onPage: (page: { items: TItem[]; page: number }) => Promise<boolean> | boolean
}

export interface ResolveManyOptions<TItem = unknown> {
  context?: ResolverContext
  inputs: ResolverInput[]
  onPage: (event: { input: ResolverInput; page: { items: TItem[]; page: number } }) => Promise<boolean> | boolean
}

export interface Indexer {
  has(kind: string): boolean
  register(resolver: ResolverDefinition): void
  resolveMany(options: ResolveManyOptions): Promise<Array<{ input: ResolverInput; result: ResolverResult }>>
  resolveOne(options: ResolveOneOptions): Promise<ResolverResult>
}

export function createIndexer({ resolvers = [] }: { resolvers?: ResolverDefinition[] } = {}): Indexer {
  const registry = new Map<string, ResolverDefinition>()

  for (const resolver of resolvers) {
    registry.set(resolver.kind, resolver)
  }

  function get(kind: string): ResolverDefinition {
    const resolver = registry.get(kind)
    if (!resolver) {
      throw new Error(`Resolver not registered: ${kind}`)
    }

    return resolver
  }

  return {
    has(kind: string) {
      return registry.has(kind)
    },

    register(resolver: ResolverDefinition) {
      registry.set(resolver.kind, resolver)
    },

    async resolveMany(options: ResolveManyOptions): Promise<Array<{ input: ResolverInput; result: ResolverResult }>> {
      const output: Array<{ input: ResolverInput; result: ResolverResult }> = []

      for (const input of options.inputs) {
        const result = await get(input.kind).resolve({
          context: options.context ?? {},
          onPage: async (page) => {
            return await options.onPage({
              input,
              page,
            })
          },
          resolver: input,
        })

        output.push({
          input,
          result,
        })
      }

      return output
    },

    async resolveOne(options: ResolveOneOptions): Promise<ResolverResult> {
      const resolver = get(options.input.kind)

      return await resolver.resolve({
        context: options.context ?? {},
        onPage: options.onPage,
        resolver: options.input,
      })
    },
  }
}
