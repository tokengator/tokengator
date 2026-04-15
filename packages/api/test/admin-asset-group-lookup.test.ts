import { describe, expect, test } from 'bun:test'

import { lookupAdminAssetGroup } from '../src/features/admin-asset-group/data-access/admin-asset-group-lookup'
import { adminAssetGroupLookupInputSchema } from '../src/features/admin-asset-group/data-access/admin-asset-group-lookup-input-schema'

const ACCOUNT = 'So11111111111111111111111111111111111111112'
const COLLECTION = 'CndyV3LdqHUYguc8SgxMny41vYFmx8Ddy8UsNfotxyiB'
const MPL_CORE_PROGRAM_ID = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d'
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
const TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'

function accountInfo(input: { owner: string; parsedType?: string; space?: number }) {
  return {
    value: {
      data: {
        parsed: {
          type: input.parsedType,
        },
        program: 'spl-token',
      },
      executable: false,
      owner: input.owner,
      space: input.space ?? 82,
    },
  }
}

function asset(input: {
  grouping?: Array<{ group_key?: string; group_value?: string; groupKey?: string; groupValue?: string }>
  id?: string
  interface?: string
  imageUrl?: string
  name?: string
  symbol?: string
  tokenProgram?: string
}) {
  return {
    content: {
      links: {
        image: input.imageUrl,
      },
      metadata: {
        name: input.name,
        symbol: input.symbol,
      },
    },
    grouping: input.grouping ?? [],
    id: input.id ?? ACCOUNT,
    interface: input.interface,
    token_info: {
      token_program: input.tokenProgram,
    },
  }
}

function createFetch(responses: Array<unknown>) {
  const calls: Array<{ method: string; params: unknown }> = []

  return {
    calls,
    fetch: async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { method: string; params: unknown }
      const response = responses.shift()

      calls.push({
        method: body.method,
        params: body.params,
      })

      if (response instanceof Error) {
        return Response.json({
          error: {
            code: -32_000,
            message: response.message,
          },
          id: 'tokengator-admin-asset-group-lookup',
          jsonrpc: '2.0',
        })
      }

      return Response.json({
        id: 'tokengator-admin-asset-group-lookup',
        jsonrpc: '2.0',
        result: response,
      })
    },
  }
}

async function lookupWithResponses(responses: Array<unknown>) {
  const mock = createFetch(responses)
  const result = await lookupAdminAssetGroup({
    account: ACCOUNT,
    apiKey: 'helius-api-key',
    cluster: 'devnet',
    fetch: mock.fetch,
  })

  return {
    calls: mock.calls,
    result,
  }
}

describe('admin asset group lookup', () => {
  test('validates Solana lookup addresses', () => {
    const validAddress = adminAssetGroupLookupInputSchema.safeParse({ address: ACCOUNT })

    expect(validAddress.success).toBe(true)
    expect(String(validAddress.data?.address)).toBe(ACCOUNT)
    expect(adminAssetGroupLookupInputSchema.safeParse({ address: 'not-a-solana-address' }).success).toBe(false)
  })

  test('returns not found for missing accounts', async () => {
    const { calls, result } = await lookupWithResponses([
      {
        value: null,
      },
      new Error('Asset not found'),
    ])

    expect(calls.map((call) => call.method)).toEqual(['getAccountInfo', 'getAsset'])
    expect(result.accountInfo).toEqual({
      executable: null,
      exists: false,
      ownerProgram: null,
      parsedType: null,
      space: null,
    })
    expect(result.asset.exists).toBe(false)
    expect(result.suggestion).toEqual({
      address: null,
      imageUrl: null,
      label: null,
      reason: 'not_found',
      resolvable: false,
      resolverKind: null,
      type: null,
    })
  })

  test('suggests the token account resolver for SPL Token mints', async () => {
    const { result } = await lookupWithResponses([
      accountInfo({
        owner: TOKEN_PROGRAM_ID,
        parsedType: 'mint',
      }),
      asset({
        imageUrl: 'https://example.com/sol.png',
        name: 'Wrapped SOL',
        symbol: 'SOL',
        tokenProgram: TOKEN_PROGRAM_ID,
      }),
    ])

    expect(result.suggestion).toEqual({
      address: ACCOUNT,
      imageUrl: 'https://example.com/sol.png',
      label: 'Wrapped SOL (SOL)',
      reason: 'mint',
      resolvable: true,
      resolverKind: 'helius-token-accounts',
      type: 'mint',
    })
  })

  test('suggests the token account resolver for Token-2022 mints', async () => {
    const { result } = await lookupWithResponses([
      accountInfo({
        owner: TOKEN_2022_PROGRAM_ID,
        parsedType: 'mint',
      }),
      asset({
        imageUrl: 'https://example.com/ext.png',
        name: 'Extension Token',
        symbol: 'EXT',
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      }),
    ])

    expect(result.suggestion).toMatchObject({
      address: ACCOUNT,
      imageUrl: 'https://example.com/ext.png',
      reason: 'mint',
      resolvable: true,
      resolverKind: 'helius-token-accounts',
      type: 'mint',
    })
  })

  test('suggests the parent collection for NFT mints with grouping', async () => {
    const { result } = await lookupWithResponses([
      accountInfo({
        owner: TOKEN_PROGRAM_ID,
        parsedType: 'mint',
        space: 82,
      }),
      asset({
        grouping: [
          {
            groupKey: 'collection',
            groupValue: COLLECTION,
          },
        ],
        imageUrl: 'https://example.com/legacy-nft.png',
        interface: 'ProgrammableNFT',
        name: 'Legacy NFT',
        symbol: 'NFT',
        tokenProgram: TOKEN_PROGRAM_ID,
      }),
      asset({
        id: COLLECTION,
        imageUrl: 'https://example.com/legacy-collection.png',
        interface: 'V1_NFT',
        name: 'Legacy Collection',
        symbol: 'COLL',
      }),
    ])

    expect(result.suggestion).toEqual({
      address: COLLECTION,
      imageUrl: 'https://example.com/legacy-collection.png',
      label: 'Legacy Collection (COLL)',
      reason: 'collection_asset',
      resolvable: true,
      resolverKind: 'helius-collection-assets',
      type: 'collection',
    })
  })

  test('suggests the parent collection for Core assets with grouping', async () => {
    const { result } = await lookupWithResponses([
      accountInfo({
        owner: MPL_CORE_PROGRAM_ID,
        parsedType: 'assetV1',
        space: 500,
      }),
      asset({
        grouping: [
          {
            group_key: 'collection',
            group_value: COLLECTION,
          },
        ],
        imageUrl: 'https://example.com/core-asset.png',
        interface: 'MplCoreAsset',
        name: 'Core Asset',
        symbol: 'CORE',
      }),
      asset({
        id: COLLECTION,
        imageUrl: 'https://example.com/core-collection.png',
        interface: 'MplCoreCollection',
        name: 'Core Collection',
        symbol: 'COREC',
      }),
    ])

    expect(result.asset.grouping).toEqual([
      {
        groupKey: 'collection',
        groupValue: COLLECTION,
      },
    ])
    expect(result.suggestion).toEqual({
      address: COLLECTION,
      imageUrl: 'https://example.com/core-collection.png',
      label: 'Core Collection (COREC)',
      reason: 'collection_asset',
      resolvable: true,
      resolverKind: 'helius-collection-assets',
      type: 'collection',
    })
  })

  test('suggests the submitted account when collection self-probe finds assets', async () => {
    const { calls, result } = await lookupWithResponses([
      accountInfo({
        owner: MPL_CORE_PROGRAM_ID,
        parsedType: 'collectionV1',
        space: 400,
      }),
      asset({
        imageUrl: 'https://example.com/core-collection.png',
        interface: 'MplCoreCollection',
        name: 'Core Collection',
        symbol: 'CORE',
      }),
      {
        items: [
          {
            id: 'asset-in-collection',
          },
        ],
      },
    ])

    expect(calls.map((call) => call.method)).toEqual(['getAccountInfo', 'getAsset', 'getAssetsByGroup'])
    expect(calls[2]?.params).toEqual({
      groupKey: 'collection',
      groupValue: ACCOUNT,
      limit: 1,
    })
    expect(result.suggestion).toEqual({
      address: ACCOUNT,
      imageUrl: 'https://example.com/core-collection.png',
      label: 'Core Collection (CORE)',
      reason: 'collection_self',
      resolvable: true,
      resolverKind: 'helius-collection-assets',
      type: 'collection',
    })
  })

  test('does not suggest token accounts', async () => {
    const { calls, result } = await lookupWithResponses([
      accountInfo({
        owner: TOKEN_PROGRAM_ID,
        parsedType: 'account',
        space: 165,
      }),
      new Error('Asset not found'),
    ])

    expect(calls.map((call) => call.method)).toEqual(['getAccountInfo', 'getAsset'])
    expect(result.suggestion).toMatchObject({
      reason: 'token_account_not_mint',
      resolvable: false,
    })
  })

  test('does not suggest Token Metadata accounts', async () => {
    const { calls, result } = await lookupWithResponses([
      accountInfo({
        owner: TOKEN_METADATA_PROGRAM_ID,
        parsedType: 'metadata',
        space: 679,
      }),
      new Error('Asset not found'),
    ])

    expect(calls.map((call) => call.method)).toEqual(['getAccountInfo', 'getAsset'])
    expect(result.suggestion).toMatchObject({
      reason: 'metadata_account_not_mint',
      resolvable: false,
    })
  })

  test('does not suggest Core assets without collection grouping', async () => {
    const { result } = await lookupWithResponses([
      accountInfo({
        owner: MPL_CORE_PROGRAM_ID,
        parsedType: 'assetV1',
        space: 500,
      }),
      asset({
        interface: 'MplCoreAsset',
        name: 'Core Asset',
        symbol: 'CORE',
      }),
      {
        items: [],
      },
    ])

    expect(result.suggestion).toMatchObject({
      reason: 'unsupported_without_collection',
      resolvable: false,
    })
  })

  test('does not suggest unsupported programs', async () => {
    const { result } = await lookupWithResponses([
      accountInfo({
        owner: '11111111111111111111111111111111',
        parsedType: 'account',
        space: 0,
      }),
      new Error('Asset not found'),
      {
        items: [],
      },
    ])

    expect(result.suggestion).toEqual({
      address: null,
      imageUrl: null,
      label: null,
      reason: 'unsupported_program',
      resolvable: false,
      resolverKind: null,
      type: null,
    })
  })
})
