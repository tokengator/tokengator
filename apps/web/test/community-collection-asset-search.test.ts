import { describe, expect, test } from 'bun:test'

import { validateCommunityCollectionAssetSearch } from '../src/features/community/util/community-collection-asset-search'

describe('community collection asset search', () => {
  test('defaults the browser state when search params are missing or invalid', () => {
    expect(validateCommunityCollectionAssetSearch({})).toEqual({
      facets: undefined,
      grid: 8,
      owner: undefined,
      query: undefined,
    })

    expect(
      validateCommunityCollectionAssetSearch({
        facets: {
          empty: ['   '],
        },
        grid: '99',
        owner: '   ',
        query: '',
      }),
    ).toEqual({
      facets: undefined,
      grid: 8,
      owner: undefined,
      query: undefined,
    })
  })

  test('normalizes grid, owner, and query from the URL search params', () => {
    expect(
      validateCommunityCollectionAssetSearch({
        facets: {
          background: [' Forest ', 'Desert', 'forest'],
          Hat: [' Cap ', 'cap'],
        },
        grid: '12',
        owner: ' owner-alpha ',
        query: ' dragon ',
      }),
    ).toEqual({
      facets: {
        background: ['desert', 'forest'],
        hat: ['cap'],
      },
      grid: 12,
      owner: 'owner-alpha',
      query: 'dragon',
    })
  })

  test('merges facet values when group ids collide after normalization', () => {
    expect(
      validateCommunityCollectionAssetSearch({
        facets: {
          ' Background ': [' Desert '],
          background: ['forest', ' Forest '],
          Hat: [' Cap '],
          ' hat ': ['cap', 'Crown'],
        },
      }),
    ).toEqual({
      facets: {
        background: ['desert', 'forest'],
        hat: ['cap', 'crown'],
      },
      grid: 8,
      owner: undefined,
      query: undefined,
    })
  })
})
