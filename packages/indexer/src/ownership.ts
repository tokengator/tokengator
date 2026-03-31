import type { ResolverInput } from './types'

export interface MatchUserInput {
  name: string
  wallets: string[]
}

export interface MatchedUserOwnership {
  assets: string[]
  matchedRows: OwnershipRow[]
  matchedWallets: string[]
  user: MatchUserInput
}

export interface MatchUsersToOwnershipRowsInput {
  options?: MatchUsersToOwnershipRowsOptions
  rows: OwnershipRow[]
  users: MatchUserInput[]
}

export interface MatchUsersToOwnershipRowsOptions {
  includeZeroBalance?: boolean
}

export interface MatchUsersToOwnershipRowsResult {
  matchedUsers: MatchedUserOwnership[]
  stats: MatchUsersToOwnershipRowsStats
  unmatchedUsers: MatchUserInput[]
}

export interface MatchUsersToOwnershipRowsStats {
  excludedZeroBalanceRows: number
  inputUsers: number
  matchedUsers: number
  rowsConsidered: number
  totalRows: number
  unmatchedUsers: number
}

export interface OwnershipRow {
  amount: string
  assetId: string
  metadataDescription?: string | null
  metadataImageUrl?: string | null
  metadataJson?: unknown | null
  metadataJsonUrl?: string | null
  metadataName?: string | null
  metadataProgramAccount?: string | null
  metadataSymbol?: string | null
  owner: string
  page: number
  resolverId: string
  resolverKind: string
}

interface AssetLike {
  content?: {
    files?: Array<{
      cdn_uri?: unknown
      uri?: unknown
    }>
    json_uri?: unknown
    jsonUri?: unknown
    links?: {
      image?: unknown
    }
    metadata?: {
      description?: unknown
      image?: unknown
      name?: unknown
      symbol?: unknown
    }
  }
  id?: string
  mint_extensions?: {
    program_id?: unknown
  }
  ownership?: {
    owner?: string
  }
  program?: unknown
  program_id?: unknown
  token_info?: {
    program?: unknown
    program_id?: unknown
    token_program?: unknown
  }
}

interface TokenAccountLike {
  amount?: number | string | null
  mint?: string
  owner?: string
}

export function normalizeOwnershipRows(input: {
  items: unknown[]
  page: number
  resolver: ResolverInput
}): OwnershipRow[] {
  if (input.resolver.kind === 'helius-collection-assets') {
    return normalizeCollectionAssetsRows(input)
  }

  if (input.resolver.kind === 'helius-token-accounts') {
    return normalizeTokenAccountsRows(input)
  }

  throw new Error(`Unsupported resolver kind for ownership normalization: ${input.resolver.kind}`)
}

export function matchUsersToOwnershipRows(input: MatchUsersToOwnershipRowsInput): MatchUsersToOwnershipRowsResult {
  const includeZeroBalance = input.options?.includeZeroBalance ?? false
  const rows = includeZeroBalance ? input.rows : input.rows.filter((row) => hasPositiveAmount(row.amount))

  const rowsByWallet = new Map<string, OwnershipRow[]>()

  for (const row of rows) {
    const walletKey = normalizeWallet(row.owner)
    if (!walletKey) {
      continue
    }

    if (!rowsByWallet.has(walletKey)) {
      rowsByWallet.set(walletKey, [])
    }

    rowsByWallet.get(walletKey)!.push(row)
  }

  const matchedUsers: MatchedUserOwnership[] = []
  const unmatchedUsers: MatchUserInput[] = []

  for (const user of input.users) {
    const userWallets = dedupeWallets(user.wallets)
    const matchedRows: OwnershipRow[] = []
    const matchedWallets: string[] = []
    const matchedWalletSet = new Set<string>()

    for (const wallet of userWallets) {
      const walletKey = normalizeWallet(wallet)
      if (!walletKey) {
        continue
      }

      const walletRows = rowsByWallet.get(walletKey)
      if (!walletRows || walletRows.length === 0) {
        continue
      }

      for (const row of walletRows) {
        matchedRows.push(row)
      }

      if (!matchedWalletSet.has(walletKey)) {
        matchedWalletSet.add(walletKey)
        matchedWallets.push(wallet)
      }
    }

    if (matchedRows.length === 0) {
      unmatchedUsers.push({
        name: user.name,
        wallets: userWallets,
      })
      continue
    }

    matchedUsers.push({
      assets: dedupeAssets(matchedRows),
      matchedRows,
      matchedWallets,
      user: {
        name: user.name,
        wallets: userWallets,
      },
    })
  }

  return {
    matchedUsers,
    stats: {
      excludedZeroBalanceRows: input.rows.length - rows.length,
      inputUsers: input.users.length,
      matchedUsers: matchedUsers.length,
      rowsConsidered: rows.length,
      totalRows: input.rows.length,
      unmatchedUsers: unmatchedUsers.length,
    },
    unmatchedUsers,
  }
}

function dedupeAssets(rows: OwnershipRow[]): string[] {
  return [...new Set(rows.map((row) => row.assetId))]
}

function dedupeWallets(wallets: string[]): string[] {
  return [...new Set(wallets.map((wallet) => normalizeWallet(wallet)).filter(Boolean))]
}

function extractMetadataImageUrl(asset: AssetLike): string | null {
  const metadataImage = readString(asset.content?.metadata?.image)
  if (metadataImage) {
    return metadataImage
  }

  const linkedImage = readString(asset.content?.links?.image)
  if (linkedImage) {
    return linkedImage
  }

  const files = asset.content?.files ?? []
  let firstUri: string | null = null

  for (const file of files) {
    const cdnImage = readString(file.cdn_uri)
    if (cdnImage) {
      return cdnImage
    }

    if (firstUri === null) {
      firstUri = readString(file.uri)
    }
  }

  return firstUri
}

function extractProgramAccount(asset: AssetLike): string | null {
  return (
    readString(asset.program) ??
    readString(asset.program_id) ??
    readString(asset.token_info?.program) ??
    readString(asset.token_info?.program_id) ??
    readString(asset.token_info?.token_program) ??
    readString(asset.mint_extensions?.program_id) ??
    null
  )
}

function normalizeCollectionAssetsRows(input: {
  items: unknown[]
  page: number
  resolver: ResolverInput
}): OwnershipRow[] {
  const rows: OwnershipRow[] = []

  for (const item of input.items as AssetLike[]) {
    const assetId = item.id
    const owner = item.ownership?.owner

    if (!owner || !assetId) {
      continue
    }

    rows.push({
      amount: '1',
      assetId,
      metadataDescription: readString(item.content?.metadata?.description),
      metadataImageUrl: extractMetadataImageUrl(item),
      metadataJson: sanitizeRawPayload(item),
      metadataJsonUrl: readString(item.content?.json_uri ?? item.content?.jsonUri),
      metadataName: readString(item.content?.metadata?.name),
      metadataProgramAccount: extractProgramAccount(item),
      metadataSymbol: readString(item.content?.metadata?.symbol),
      owner,
      page: input.page,
      resolverId: input.resolver.id,
      resolverKind: input.resolver.kind,
    })
  }

  return rows
}

function normalizeTokenAccountsRows(input: {
  items: unknown[]
  page: number
  resolver: ResolverInput
}): OwnershipRow[] {
  const rows: OwnershipRow[] = []

  for (const item of input.items as TokenAccountLike[]) {
    const assetId = item.mint
    const owner = item.owner

    if (!owner || !assetId) {
      continue
    }

    const amount = normalizeAmountToString(item.amount)
    if (amount === null) {
      continue
    }

    rows.push({
      amount,
      assetId,
      owner,
      page: input.page,
      resolverId: input.resolver.id,
      resolverKind: input.resolver.kind,
    })
  }

  return rows
}

function normalizeWallet(wallet: string): string {
  return wallet.trim()
}

export function hasPositiveAmount(amount: number | string | null | undefined): boolean {
  const normalizedAmount = normalizeAmountToBigInt(amount)
  return normalizedAmount !== null && normalizedAmount > 0n
}

export function normalizeAmountToBigInt(amount: number | string | null | undefined): bigint | null {
  const normalizedAmount = normalizeAmountToString(amount)
  if (normalizedAmount === null) {
    return null
  }

  try {
    return BigInt(normalizedAmount)
  } catch {
    return null
  }
}

export function normalizeAmountToNumber(amount: number | string | null | undefined): number | null {
  const normalizedAmount = normalizeAmountToString(amount)
  if (normalizedAmount === null) {
    return null
  }

  const parsedAmount = Number(normalizedAmount)
  if (!Number.isSafeInteger(parsedAmount)) {
    return null
  }

  return parsedAmount
}

export function normalizeAmountToString(amount: number | string | null | undefined): string | null {
  if (amount == null) {
    return '0'
  }

  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
      return null
    }

    return String(amount)
  }

  return /^\d+$/.test(amount) ? amount : null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function sanitizeRawPayload(value: unknown): unknown {
  const seen = new WeakSet<object>()

  function recurse(current: unknown): unknown {
    if (Array.isArray(current)) {
      return current.map((item) => recurse(item))
    }

    if (!current || typeof current !== 'object') {
      return current
    }

    if (seen.has(current)) {
      return '[Circular Reference]'
    }

    seen.add(current)

    const sanitized: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(current)) {
      if (key.startsWith('$')) {
        continue
      }

      sanitized[key] = recurse(nestedValue)
    }

    return sanitized
  }

  return recurse(value)
}
