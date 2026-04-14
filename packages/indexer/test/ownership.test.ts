import { describe, expect, test } from 'bun:test'

import {
  hasPositiveAmount,
  matchUsersToOwnershipRows,
  normalizeAmountToBigInt,
  normalizeAmountToNumber,
  normalizeAmountToString,
  normalizeOwnershipRows,
  type OwnershipRow,
} from '../src/index'

const TOKEN_RESOLVER = {
  config: {
    mint: 'mint-a',
  },
  id: 'resolver-token',
  kind: 'helius-token-accounts',
} as const

const COLLECTION_RESOLVER = {
  config: {
    collection: 'collection-a',
  },
  id: 'resolver-collection',
  kind: 'helius-collection-assets',
} as const

describe('normalizeOwnershipRows', () => {
  test('normalizes collection assets with string amounts', () => {
    const rows = normalizeOwnershipRows({
      items: [
        {
          content: {
            metadata: {
              name: 'Alpha',
            },
          },
          id: 'asset-a',
          ownership: {
            owner: 'wallet-a',
          },
        },
      ],
      page: 1,
      resolver: COLLECTION_RESOLVER,
    })

    expect(rows).toEqual([
      {
        amount: '1',
        assetId: 'asset-a',
        metadataDescription: null,
        metadataImageUrl: null,
        metadataJson: {
          content: {
            metadata: {
              name: 'Alpha',
            },
          },
          id: 'asset-a',
          ownership: {
            owner: 'wallet-a',
          },
        },
        metadataJsonUrl: null,
        metadataName: 'Alpha',
        metadataProgramAccount: null,
        metadataSymbol: null,
        owner: 'wallet-a',
        page: 1,
        resolverId: 'resolver-collection',
        resolverKind: 'helius-collection-assets',
        traits: [],
      },
    ])
  })

  test('normalizes, deduplicates, and sorts collection asset traits', () => {
    const rows = normalizeOwnershipRows({
      items: [
        {
          content: {
            metadata: {
              attributes: [
                {
                  trait_type: 'Hat',
                  value: 'Cap',
                },
                {
                  trait_type: 'hat',
                  value: 'cap',
                },
                {
                  trait_type: 'Background',
                  value: ' Blue ',
                },
                {
                  trait_type: 'Flag',
                  value: true,
                },
                {
                  trait_type: 'Rank',
                  value: 1,
                },
                {
                  trait_type: '  ',
                  value: 'ignored',
                },
                {
                  trait_type: 'Eyes',
                  value: '   ',
                },
              ],
              name: 'Alpha',
            },
          },
          id: 'asset-a',
          ownership: {
            owner: 'wallet-a',
          },
        },
      ],
      page: 1,
      resolver: COLLECTION_RESOLVER,
    })

    expect(rows[0]?.traits).toEqual([
      {
        groupId: 'background',
        groupLabel: 'Background',
        value: 'blue',
        valueLabel: 'Blue',
      },
      {
        groupId: 'flag',
        groupLabel: 'Flag',
        value: 'true',
        valueLabel: 'true',
      },
      {
        groupId: 'hat',
        groupLabel: 'Hat',
        value: 'cap',
        valueLabel: 'Cap',
      },
      {
        groupId: 'rank',
        groupLabel: 'Rank',
        value: '1',
        valueLabel: '1',
      },
    ])
  })

  test('falls back to top-level attributes when metadata attributes are missing', () => {
    const rows = normalizeOwnershipRows({
      items: [
        {
          attributes: [
            {
              traitType: 'Accessory',
              value: 'Bow',
            },
          ],
          content: {
            metadata: {
              name: 'Alpha',
            },
          },
          id: 'asset-a',
          ownership: {
            owner: 'wallet-a',
          },
        },
      ],
      page: 1,
      resolver: COLLECTION_RESOLVER,
    })

    expect(rows[0]?.traits).toEqual([
      {
        groupId: 'accessory',
        groupLabel: 'Accessory',
        value: 'bow',
        valueLabel: 'Bow',
      },
    ])
  })

  test('merges metadata and top-level collection asset traits', () => {
    const rows = normalizeOwnershipRows({
      items: [
        {
          attributes: [
            {
              traitType: 'Accessory',
              value: 'Bow',
            },
          ],
          content: {
            metadata: {
              attributes: [
                {
                  trait_type: 'Background',
                  value: 'Red',
                },
              ],
              name: 'Alpha',
            },
          },
          id: 'asset-a',
          ownership: {
            owner: 'wallet-a',
          },
        },
      ],
      page: 1,
      resolver: COLLECTION_RESOLVER,
    })

    expect(rows[0]?.traits).toEqual([
      {
        groupId: 'accessory',
        groupLabel: 'Accessory',
        value: 'bow',
        valueLabel: 'Bow',
      },
      {
        groupId: 'background',
        groupLabel: 'Background',
        value: 'red',
        valueLabel: 'Red',
      },
    ])
  })

  test('normalizes token-account amounts as strings without precision loss', () => {
    const rows = normalizeOwnershipRows({
      items: [
        {
          amount: '9007199254740993',
          mint: 'mint-a',
          owner: 'wallet-a',
        },
        {
          amount: '00042',
          mint: 'mint-b',
          owner: 'wallet-b',
        },
        {
          amount: 7,
          mint: 'mint-c',
          owner: 'wallet-c',
        },
        {
          mint: 'mint-d',
          owner: 'wallet-d',
        },
      ],
      page: 2,
      resolver: TOKEN_RESOLVER,
    })

    expect(rows.map((row) => row.amount)).toEqual(['9007199254740993', '00042', '7', '0'])
  })

  test('skips malformed token-account amounts', () => {
    const rows = normalizeOwnershipRows({
      items: [
        {
          amount: '1.5',
          mint: 'mint-a',
          owner: 'wallet-a',
        },
        {
          amount: 'abc',
          mint: 'mint-b',
          owner: 'wallet-b',
        },
        {
          amount: Number.POSITIVE_INFINITY,
          mint: 'mint-c',
          owner: 'wallet-c',
        },
        {
          amount: 1.5,
          mint: 'mint-d',
          owner: 'wallet-d',
        },
      ],
      page: 3,
      resolver: TOKEN_RESOLVER,
    })

    expect(rows).toEqual([])
  })
})

describe('amount helpers', () => {
  test('exports positive-amount checks and safe conversions', () => {
    expect(hasPositiveAmount('1')).toBe(true)
    expect(hasPositiveAmount('0')).toBe(false)
    expect(hasPositiveAmount('abc')).toBe(false)
    expect(normalizeAmountToBigInt('9007199254740993')).toBe(9007199254740993n)
    expect(normalizeAmountToNumber('42')).toBe(42)
    expect(normalizeAmountToNumber('9007199254740993')).toBeNull()
    expect(normalizeAmountToString(undefined)).toBe('0')
  })
})

describe('matchUsersToOwnershipRows', () => {
  test('filters zero-balance rows using string amounts', () => {
    const rows: OwnershipRow[] = [
      {
        amount: '0',
        assetId: 'asset-a',
        owner: 'wallet-a',
        page: 1,
        resolverId: 'resolver-token',
        resolverKind: 'helius-token-accounts',
      },
      {
        amount: '1',
        assetId: 'asset-b',
        owner: 'wallet-a',
        page: 1,
        resolverId: 'resolver-token',
        resolverKind: 'helius-token-accounts',
      },
    ]

    const result = matchUsersToOwnershipRows({
      rows,
      users: [
        {
          name: 'Alice',
          wallets: ['wallet-a'],
        },
      ],
    })

    expect(result.matchedUsers).toHaveLength(1)
    expect(result.matchedUsers[0]?.matchedRows.map((row) => row.amount)).toEqual(['1'])
    expect(result.stats.excludedZeroBalanceRows).toBe(1)
  })

  test('keeps zero-balance rows when includeZeroBalance is enabled', () => {
    const rows: OwnershipRow[] = [
      {
        amount: '0',
        assetId: 'asset-a',
        owner: 'wallet-a',
        page: 1,
        resolverId: 'resolver-token',
        resolverKind: 'helius-token-accounts',
      },
      {
        amount: '5',
        assetId: 'asset-b',
        owner: 'wallet-a',
        page: 1,
        resolverId: 'resolver-token',
        resolverKind: 'helius-token-accounts',
      },
    ]

    const result = matchUsersToOwnershipRows({
      options: {
        includeZeroBalance: true,
      },
      rows,
      users: [
        {
          name: 'Alice',
          wallets: ['wallet-a'],
        },
      ],
    })

    expect(result.matchedUsers).toHaveLength(1)
    expect(result.matchedUsers[0]?.matchedRows.map((row) => row.amount)).toEqual(['0', '5'])
    expect(result.stats.excludedZeroBalanceRows).toBe(0)
  })
})
