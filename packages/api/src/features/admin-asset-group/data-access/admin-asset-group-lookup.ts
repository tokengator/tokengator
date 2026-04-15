import { HELIUS_COLLECTION_ASSETS, HELIUS_TOKEN_ACCOUNTS, type ResolverKind } from '@tokengator/indexer'

import type { AdminAssetGroupEntity } from './admin-asset-group.entity'

const HELIUS_RPC_HOST_BY_CLUSTER = {
  devnet: 'https://devnet.helius-rpc.com/',
  mainnet: 'https://mainnet.helius-rpc.com/',
} as const

const MPL_CORE_PROGRAM_ID = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d'
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
const TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const TOKEN_PROGRAM_IDS = new Set([TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID])

type HeliusCluster = keyof typeof HELIUS_RPC_HOST_BY_CLUSTER

type JsonRpcFetch = (input: string | URL, init?: RequestInit) => Promise<Response>

type JsonRecord = Record<string, unknown>

export type AdminAssetGroupLookupReason =
  | 'collection_asset'
  | 'collection_self'
  | 'metadata_account_not_mint'
  | 'mint'
  | 'not_found'
  | 'token_account_not_mint'
  | 'unsupported_program'
  | 'unsupported_without_collection'

export interface AdminAssetGroupLookupAccountInfo {
  executable: boolean | null
  exists: boolean
  ownerProgram: string | null
  parsedType: string | null
  space: number | null
}

export interface AdminAssetGroupLookupAsset {
  exists: boolean
  grouping: Array<{ groupKey: string; groupValue: string }>
  id: string | null
  imageUrl: string | null
  interface: string | null
  name: string | null
  symbol: string | null
  tokenProgram: string | null
}

export interface AdminAssetGroupLookupSuggestion {
  address: string | null
  imageUrl: string | null
  label: string | null
  reason: AdminAssetGroupLookupReason
  resolvable: boolean
  resolverKind: ResolverKind | null
  type: 'collection' | 'mint' | null
}

export interface AdminAssetGroupLookupResult {
  account: string
  accountInfo: AdminAssetGroupLookupAccountInfo
  asset: AdminAssetGroupLookupAsset
  cluster: HeliusCluster
  existingAssetGroup: AdminAssetGroupEntity | null
  suggestion: AdminAssetGroupLookupSuggestion
  warnings: string[]
}

export interface LookupAdminAssetGroupOptions {
  account: string
  apiKey: string
  cluster: HeliusCluster
  fetch?: JsonRpcFetch
  signal?: AbortSignal
}

interface HeliusJsonRpcResponse<T> {
  error?: {
    code?: number
    data?: unknown
    message?: string
  }
  result?: T
}

interface HeliusGetAccountInfoResult {
  value?: unknown
}

class HeliusRpcError extends Error {
  public readonly code?: number
  public readonly method: string
  public readonly status?: number

  public constructor(input: { code?: number; message: string; method: string; status?: number }) {
    super(input.message)

    this.name = 'HeliusRpcError'
    this.code = input.code
    this.method = input.method
    this.status = input.status
  }
}

export async function lookupAdminAssetGroup(
  options: LookupAdminAssetGroupOptions,
): Promise<AdminAssetGroupLookupResult> {
  const account = options.account.trim()
  const rpcFetch = options.fetch ?? fetch
  const rpcUrl = getHeliusRpcUrl({
    apiKey: options.apiKey,
    cluster: options.cluster,
  })
  const warnings: string[] = []

  const [accountInfo, asset] = await Promise.all([
    lookupAccountInfo({
      account,
      fetch: rpcFetch,
      signal: options.signal,
      url: rpcUrl,
    }),
    lookupAsset({
      account,
      fetch: rpcFetch,
      signal: options.signal,
      url: rpcUrl,
      warnings,
    }),
  ])
  const suggestion = await getSuggestion({
    account,
    accountInfo,
    asset,
    fetch: rpcFetch,
    signal: options.signal,
    url: rpcUrl,
    warnings,
  })

  return {
    account,
    accountInfo,
    asset,
    cluster: options.cluster,
    existingAssetGroup: null,
    suggestion,
    warnings: [...warnings].sort((left, right) => left.localeCompare(right)),
  }
}

async function callHeliusRpc<T>(input: {
  fetch: JsonRpcFetch
  method: string
  params: unknown
  signal?: AbortSignal
  url: string
}): Promise<T> {
  const response = await input.fetch(input.url, {
    body: JSON.stringify({
      id: 'tokengator-admin-asset-group-lookup',
      jsonrpc: '2.0',
      method: input.method,
      params: input.params,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal: input.signal,
  })

  const payload = (await response.json().catch(() => null)) as HeliusJsonRpcResponse<T> | null

  if (!response.ok) {
    throw new HeliusRpcError({
      message: `Helius ${input.method} request failed with status ${response.status}.`,
      method: input.method,
      status: response.status,
    })
  }

  if (!payload || typeof payload !== 'object') {
    throw new HeliusRpcError({
      message: `Helius ${input.method} returned an invalid JSON-RPC response.`,
      method: input.method,
    })
  }

  if (payload.error) {
    throw new HeliusRpcError({
      code: payload.error.code,
      message: payload.error.message ?? `Helius ${input.method} returned an error.`,
      method: input.method,
    })
  }

  return payload.result as T
}

function formatLabel(input: { fallback: string; name: string | null; symbol: string | null }) {
  if (input.name && input.symbol) {
    return `${input.name} (${input.symbol})`
  }

  return input.name ?? input.symbol ?? input.fallback
}

async function getCollectionSelfSuggestion(input: {
  account: string
  asset: AdminAssetGroupLookupAsset
  fetch: JsonRpcFetch
  signal?: AbortSignal
  url: string
  warnings: string[]
}): Promise<AdminAssetGroupLookupSuggestion | null> {
  try {
    const result = await callHeliusRpc<unknown>({
      fetch: input.fetch,
      method: 'getAssetsByGroup',
      params: {
        groupKey: 'collection',
        groupValue: input.account,
        limit: 1,
      },
      signal: input.signal,
      url: input.url,
    })
    const items = readArray(readRecord(result)?.items)

    if (items.length === 0) {
      return null
    }

    return {
      address: input.account,
      imageUrl: input.asset.imageUrl,
      label: formatLabel({
        fallback: input.account,
        name: input.asset.name,
        symbol: input.asset.symbol,
      }),
      reason: 'collection_self',
      resolvable: true,
      resolverKind: HELIUS_COLLECTION_ASSETS,
      type: 'collection',
    }
  } catch (error) {
    input.warnings.push(formatLookupWarning(error, 'Collection self-probe failed.'))

    return null
  }
}

async function getSuggestion(input: {
  account: string
  accountInfo: AdminAssetGroupLookupAccountInfo
  asset: AdminAssetGroupLookupAsset
  fetch: JsonRpcFetch
  signal?: AbortSignal
  url: string
  warnings: string[]
}): Promise<AdminAssetGroupLookupSuggestion> {
  const collectionGrouping = input.asset.grouping.find((group) => group.groupKey === 'collection')
  if (collectionGrouping) {
    const collectionAsset = await lookupAsset({
      account: collectionGrouping.groupValue,
      fetch: input.fetch,
      signal: input.signal,
      url: input.url,
      warnings: input.warnings,
    })

    return {
      address: collectionGrouping.groupValue,
      imageUrl: collectionAsset.imageUrl,
      label: formatLabel({
        fallback: collectionGrouping.groupValue,
        name: collectionAsset.name ?? input.asset.name,
        symbol: collectionAsset.symbol ?? input.asset.symbol,
      }),
      reason: 'collection_asset',
      resolvable: true,
      resolverKind: HELIUS_COLLECTION_ASSETS,
      type: 'collection',
    }
  }

  if (isTokenProgram(input.accountInfo.ownerProgram)) {
    if (input.accountInfo.parsedType === 'mint') {
      return {
        address: input.account,
        imageUrl: input.asset.imageUrl,
        label: formatLabel({
          fallback: input.account,
          name: input.asset.name,
          symbol: input.asset.symbol,
        }),
        reason: 'mint',
        resolvable: true,
        resolverKind: HELIUS_TOKEN_ACCOUNTS,
        type: 'mint',
      }
    }

    return unsupportedSuggestion('token_account_not_mint')
  }

  if (input.accountInfo.ownerProgram === TOKEN_METADATA_PROGRAM_ID) {
    return unsupportedSuggestion('metadata_account_not_mint')
  }

  if (input.accountInfo.exists || input.asset.exists) {
    const collectionSelfSuggestion = await getCollectionSelfSuggestion(input)

    if (collectionSelfSuggestion) {
      return collectionSelfSuggestion
    }
  }

  if (!input.accountInfo.exists && !input.asset.exists) {
    return unsupportedSuggestion('not_found')
  }

  if (input.asset.exists || input.accountInfo.ownerProgram === MPL_CORE_PROGRAM_ID) {
    return unsupportedSuggestion('unsupported_without_collection')
  }

  return unsupportedSuggestion('unsupported_program')
}

function getHeliusRpcUrl(input: { apiKey: string; cluster: HeliusCluster }) {
  const url = new URL(HELIUS_RPC_HOST_BY_CLUSTER[input.cluster])

  url.searchParams.set('api-key', input.apiKey)

  return url.toString()
}

function isNotFoundError(error: unknown) {
  return error instanceof HeliusRpcError && error.message.toLowerCase().includes('not found')
}

function isTokenProgram(programId: string | null) {
  return Boolean(programId && TOKEN_PROGRAM_IDS.has(programId))
}

async function lookupAccountInfo(input: {
  account: string
  fetch: JsonRpcFetch
  signal?: AbortSignal
  url: string
}): Promise<AdminAssetGroupLookupAccountInfo> {
  const response = await callHeliusRpc<HeliusGetAccountInfoResult>({
    fetch: input.fetch,
    method: 'getAccountInfo',
    params: [
      input.account,
      {
        encoding: 'jsonParsed',
      },
    ],
    signal: input.signal,
    url: input.url,
  })
  const account = readRecord(response.value)

  if (!account) {
    return {
      executable: null,
      exists: false,
      ownerProgram: null,
      parsedType: null,
      space: null,
    }
  }

  const data = readRecord(account.data)
  const parsed = readRecord(data?.parsed)

  return {
    executable: readBoolean(account.executable),
    exists: true,
    ownerProgram: readString(account.owner),
    parsedType: readString(parsed?.type),
    space: readNumber(account.space),
  }
}

async function lookupAsset(input: {
  account: string
  fetch: JsonRpcFetch
  signal?: AbortSignal
  url: string
  warnings: string[]
}): Promise<AdminAssetGroupLookupAsset> {
  try {
    const result = await callHeliusRpc<unknown>({
      fetch: input.fetch,
      method: 'getAsset',
      params: {
        id: input.account,
      },
      signal: input.signal,
      url: input.url,
    })
    const record = readRecord(result)

    if (!record) {
      return missingAsset()
    }

    const content = readRecord(record.content)
    const metadata = readRecord(content?.metadata)
    const tokenInfo = readRecord(record.token_info)
    const mintExtensions = readRecord(record.mint_extensions)

    return {
      exists: true,
      grouping: normalizeGrouping(record.grouping),
      id: readString(record.id),
      imageUrl: readAssetImageUrl(record),
      interface: readString(record.interface),
      name: readString(metadata?.name),
      symbol: readString(metadata?.symbol),
      tokenProgram:
        readString(tokenInfo?.token_program) ??
        readString(tokenInfo?.program_id) ??
        readString(mintExtensions?.program_id) ??
        readString(record.program_id) ??
        null,
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      input.warnings.push(formatLookupWarning(error, 'Asset lookup failed.'))
    }

    return missingAsset()
  }
}

function formatLookupWarning(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function missingAsset(): AdminAssetGroupLookupAsset {
  return {
    exists: false,
    grouping: [],
    id: null,
    imageUrl: null,
    interface: null,
    name: null,
    symbol: null,
    tokenProgram: null,
  }
}

function normalizeGrouping(value: unknown): Array<{ groupKey: string; groupValue: string }> {
  return readArray(value)
    .flatMap((item) => {
      const record = readRecord(item)
      const groupKey = readString(record?.groupKey) ?? readString(record?.group_key)
      const groupValue = readString(record?.groupValue) ?? readString(record?.group_value)

      if (!groupKey || !groupValue) {
        return []
      }

      return [
        {
          groupKey,
          groupValue,
        },
      ]
    })
    .sort((left, right) => {
      const keyOrder = left.groupKey.localeCompare(right.groupKey)

      return keyOrder === 0 ? left.groupValue.localeCompare(right.groupValue) : keyOrder
    })
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readAssetImageUrl(asset: JsonRecord): string | null {
  const content = readRecord(asset.content)
  const metadata = readRecord(content?.metadata)
  const links = readRecord(content?.links)
  const files = readArray(content?.files)
  let firstUri: string | null = null

  const metadataImage = readString(metadata?.image)
  if (metadataImage) {
    return metadataImage
  }

  const linkedImage = readString(links?.image)
  if (linkedImage) {
    return linkedImage
  }

  for (const file of files) {
    const record = readRecord(file)
    const cdnUri = readString(record?.cdn_uri)

    if (cdnUri) {
      return cdnUri
    }

    firstUri ??= readString(record?.uri)
  }

  return firstUri
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function unsupportedSuggestion(
  reason: Exclude<AdminAssetGroupLookupReason, 'collection_asset' | 'collection_self' | 'mint'>,
) {
  return {
    address: null,
    imageUrl: null,
    label: null,
    reason,
    resolvable: false,
    resolverKind: null,
    type: null,
  }
}
