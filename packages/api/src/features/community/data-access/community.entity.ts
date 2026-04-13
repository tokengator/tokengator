import { organization } from '@tokengator/db/schema/auth'

export const communityEntityColumns = {
  id: organization.id,
  logo: organization.logo,
  name: organization.name,
  slug: organization.slug,
}

export function toCommunityCollectionEntity(input: { address: string; id: string; label: string; type: 'collection' }) {
  return input
}

export function toCommunityDetailEntity(input: {
  collections: CommunityCollectionEntity[]
  community: CommunityEntity
}) {
  return {
    ...input.community,
    collections: input.collections,
  }
}

export function toCommunityEntity(input: { id: string; logo: string | null; name: string; slug: string }) {
  return input
}

export type CommunityCollectionEntity = ReturnType<typeof toCommunityCollectionEntity>
export type CommunityDetailEntity = ReturnType<typeof toCommunityDetailEntity>
export type CommunityEntity = ReturnType<typeof toCommunityEntity>
export type CommunityGetBySlugResult = CommunityDetailEntity
export type CommunityListResult = {
  communities: CommunityEntity[]
}
