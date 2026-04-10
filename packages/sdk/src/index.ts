import type { RPCLinkOptions } from '@orpc/client/fetch'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { AppRouterClient } from '@tokengator/api/router'

import { resolveRpcUrl } from './lib/rpc-url'

export type OrpcClientFetch = (input: Request | URL | string, init?: RequestInit) => Promise<Response>
export type * from '@tokengator/api'

export type CreateOrpcClientOptions = {
  baseUrl: RPCLinkOptions<Record<never, never>>['url']
  credentials?: 'include' | 'omit' | 'same-origin'
  fetch?: OrpcClientFetch
  headers?: RPCLinkOptions<Record<never, never>>['headers']
  rpcPath?: string
}

export type OrpcClient = AppRouterClient

export function createOrpcClient(options: CreateOrpcClientOptions): OrpcClient {
  const {
    baseUrl,
    credentials = 'include',
    fetch: fetchImplementation = fetch as OrpcClientFetch,
    headers,
    rpcPath = '/rpc',
  } = options
  const link = new RPCLink({
    fetch(request, init) {
      return fetchImplementation(request, {
        ...init,
        credentials,
      })
    },
    headers,
    url: async (options, path, input) => {
      const resolvedBaseUrl = typeof baseUrl === 'function' ? await baseUrl(options, path, input) : baseUrl

      return resolveRpcUrl(resolvedBaseUrl.toString(), rpcPath)
    },
  })

  return createORPCClient(link) as OrpcClient
}
