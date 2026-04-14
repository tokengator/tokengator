import { describe, expect, test } from 'bun:test'

import { validateCommunityCollectionAssetSearch } from '../src/features/community/util/community-collection-asset-search'

describe('community collection asset search', () => {
  test('defaults the browser state when search params are missing or invalid', () => {
    expect(validateCommunityCollectionAssetSearch({})).toEqual({
      grid: 8,
      owner: undefined,
      query: undefined,
    })

    expect(
      validateCommunityCollectionAssetSearch({
        grid: '99',
        owner: '   ',
        query: '',
      }),
    ).toEqual({
      grid: 8,
      owner: undefined,
      query: undefined,
    })
  })

  test('normalizes grid, owner, and query from the URL search params', () => {
    expect(
      validateCommunityCollectionAssetSearch({
        grid: '12',
        owner: ' owner-alpha ',
        query: ' dragon ',
      }),
    ).toEqual({
      grid: 12,
      owner: 'owner-alpha',
      query: 'dragon',
    })
  })
})
