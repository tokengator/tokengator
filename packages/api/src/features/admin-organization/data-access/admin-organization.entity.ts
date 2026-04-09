import type { InferSelectModel } from 'drizzle-orm'
import { member, organization, user } from '@tokengator/db/schema/auth'

import type { AdminCommunityDiscordConnection } from '../../../features/community-discord-connection'

import { adminOrganizationNormalizeMetadata } from '../util/admin-organization-normalize-metadata'
import { adminOrganizationHasOwnerRole } from '../util/admin-organization-owner-role'

export const adminOrganizationEntityColumns = {
  createdAt: organization.createdAt,
  id: organization.id,
  logo: organization.logo,
  metadata: organization.metadata,
  name: organization.name,
  slug: organization.slug,
}

export const adminOrganizationMemberEntityColumns = {
  createdAt: member.createdAt,
  id: member.id,
  name: user.name,
  organizationId: member.organizationId,
  role: member.role,
  userId: user.id,
  username: user.username,
}

export const adminOrganizationOwnerCandidateEntityColumns = {
  id: user.id,
  name: user.name,
  username: user.username,
}

type AdminOrganizationOwnerCandidateRecord = Pick<
  InferSelectModel<typeof user>,
  keyof typeof adminOrganizationOwnerCandidateEntityColumns
>
type AdminOrganizationRecord = Pick<InferSelectModel<typeof organization>, keyof typeof adminOrganizationEntityColumns>

export type AdminOrganizationMemberRecord = {
  createdAt: Date
  id: string
  name: string
  organizationId: string
  role: string
  userId: string
  username: string | null
}

type AdminOrganizationOwnerInput = {
  name: string
  userId: string
  username: string | null
}

export function toAdminOrganizationEntity(record: AdminOrganizationRecord) {
  return {
    ...record,
    metadata: adminOrganizationNormalizeMetadata(record.metadata),
  }
}

export function toAdminOrganizationGatedRoleEntity(input: { id: string; name: string; slug: string }) {
  return input
}

export function toAdminOrganizationMemberEntity(input: {
  gatedRoles: AdminOrganizationGatedRoleEntity[]
  isManaged: boolean
  member: AdminOrganizationMemberRecord
}) {
  return {
    ...input.member,
    gatedRoles: input.gatedRoles,
    isManaged: input.isManaged,
  }
}

export function toAdminOrganizationOwnerCandidateEntity(record: AdminOrganizationOwnerCandidateRecord) {
  return record
}

export function toAdminOrganizationOwnerEntity(input: AdminOrganizationOwnerInput) {
  return input
}

function toAdminOrganizationOwners(
  members: Array<Pick<AdminOrganizationMemberEntity, 'name' | 'role' | 'userId' | 'username'>>,
) {
  return members
    .filter((entry) => adminOrganizationHasOwnerRole(entry.role))
    .map((entry) =>
      toAdminOrganizationOwnerEntity({
        name: entry.name,
        userId: entry.userId,
        username: entry.username,
      }),
    )
}

export function toAdminOrganizationDetailEntity(input: {
  discordConnection: AdminCommunityDiscordConnection | null
  members: AdminOrganizationMemberEntity[]
  organization: AdminOrganizationEntity
}) {
  return {
    ...input.organization,
    discordConnection: input.discordConnection,
    memberCount: input.members.length,
    members: input.members,
    owners: toAdminOrganizationOwners(input.members),
  }
}

export function toAdminOrganizationListEntity(input: {
  members: Array<Pick<AdminOrganizationMemberRecord, 'name' | 'role' | 'userId' | 'username'>>
  organization: AdminOrganizationEntity
}) {
  return {
    ...input.organization,
    memberCount: input.members.length,
    owners: toAdminOrganizationOwners(input.members),
  }
}

export type AdminOrganizationDetailEntity = ReturnType<typeof toAdminOrganizationDetailEntity>
export type AdminOrganizationEntity = ReturnType<typeof toAdminOrganizationEntity>
export type AdminOrganizationGatedRoleEntity = ReturnType<typeof toAdminOrganizationGatedRoleEntity>
export type AdminOrganizationListEntity = ReturnType<typeof toAdminOrganizationListEntity>
export type AdminOrganizationMemberEntity = ReturnType<typeof toAdminOrganizationMemberEntity>
export type AdminOrganizationOwnerCandidateEntity = ReturnType<typeof toAdminOrganizationOwnerCandidateEntity>
export type AdminOrganizationOwnerEntity = ReturnType<typeof toAdminOrganizationOwnerEntity>
