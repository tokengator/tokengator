import { ORPCError } from '@orpc/server'
import { and, asc, count, eq, inArray, or, sql } from 'drizzle-orm'
import z from 'zod'
import { auth } from '@tokengator/auth'
import { db } from '@tokengator/db'
import { invitation, member, organization, session, team, teamMember, user } from '@tokengator/db/schema/auth'
import { communityManagedMember } from '@tokengator/db/schema/community-role'

import { adminProcedure } from '../index'
import {
  listCommunityManagedMemberUserIds,
  listCommunityRoleAssignmentsForUsers,
} from '../lib/admin-community-role-sync'

const memberRoleSchema = z.enum(['admin', 'member', 'owner'])

const listOrganizationsInputSchema = z
  .object({
    limit: z.number().int().max(100).min(1).optional(),
    offset: z.number().int().min(0).optional(),
    search: z.string().trim().min(1).optional(),
  })
  .optional()

const listOwnerCandidatesInputSchema = z
  .object({
    limit: z.number().int().max(20).min(1).optional(),
    search: z.string().trim().min(1).optional(),
  })
  .optional()

function createSearchPattern(search?: string) {
  if (!search) {
    return undefined
  }

  return `%${search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}

function getOrganizationFilter(search?: string) {
  const pattern = createSearchPattern(search)

  if (!pattern) {
    return undefined
  }

  return or(
    sql`${organization.name} like ${pattern} escape '\\'`,
    sql`${organization.slug} like ${pattern} escape '\\'`,
  )
}

function getUserFilter(search?: string) {
  const pattern = createSearchPattern(search)

  if (!pattern) {
    return undefined
  }

  return or(sql`${user.name} like ${pattern} escape '\\'`, sql`${user.username} like ${pattern} escape '\\'`)
}

function includesOwner(role: string) {
  return role.split(',').includes('owner')
}

function normalizeLogo(logo?: string) {
  const trimmedLogo = logo?.trim()

  return trimmedLogo ? trimmedLogo : null
}

function normalizeMetadata(metadata: string | null) {
  if (!metadata) {
    return null
  }

  try {
    return JSON.parse(metadata)
  } catch {
    return metadata
  }
}

async function getOrganizationRecordById(organizationId: string) {
  const [record] = await db
    .select({
      createdAt: organization.createdAt,
      id: organization.id,
      logo: organization.logo,
      metadata: organization.metadata,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  return record ?? null
}

async function getOrganizationMembers(organizationId: string) {
  return await db
    .select({
      createdAt: member.createdAt,
      id: member.id,
      name: user.name,
      organizationId: member.organizationId,
      role: member.role,
      userId: user.id,
      username: user.username,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(user.name), asc(user.username), asc(user.id))
}

async function decorateOrganizationMembers(
  members: Awaited<ReturnType<typeof getOrganizationMembers>>,
  organizationId: string,
) {
  if (members.length === 0) {
    return []
  }

  const userIds = members.map((memberRecord) => memberRecord.userId)
  const [managedMembers, gatedRoleAssignments] = await Promise.all([
    listCommunityManagedMemberUserIds({
      organizationIds: [organizationId],
      userIds,
    }),
    listCommunityRoleAssignmentsForUsers({
      organizationIds: [organizationId],
      userIds,
    }),
  ])
  const managedUserIds = new Set(
    managedMembers
      .filter((managedMember) => managedMember.organizationId === organizationId)
      .map((managedMember) => managedMember.userId),
  )
  const gatedRolesByUserId = new Map<string, Array<{ id: string; name: string; slug: string }>>()

  for (const gatedRoleAssignment of gatedRoleAssignments) {
    const existingRoles = gatedRolesByUserId.get(gatedRoleAssignment.userId) ?? []

    gatedRolesByUserId.set(gatedRoleAssignment.userId, [
      ...existingRoles,
      {
        id: gatedRoleAssignment.roleId,
        name: gatedRoleAssignment.name,
        slug: gatedRoleAssignment.slug,
      },
    ])
  }

  return members.map((memberRecord) => ({
    ...memberRecord,
    gatedRoles: gatedRolesByUserId.get(memberRecord.userId) ?? [],
    isManaged: managedUserIds.has(memberRecord.userId),
  }))
}

async function getOrganizationDetail(organizationId: string) {
  const organizationRecord = await getOrganizationRecordById(organizationId)

  if (!organizationRecord) {
    return null
  }

  const members = await decorateOrganizationMembers(await getOrganizationMembers(organizationId), organizationId)
  const owners = members
    .filter((entry) => includesOwner(entry.role))
    .map((entry) => ({
      name: entry.name,
      userId: entry.userId,
      username: entry.username,
    }))

  return {
    createdAt: organizationRecord.createdAt,
    id: organizationRecord.id,
    logo: organizationRecord.logo,
    memberCount: members.length,
    members,
    metadata: normalizeMetadata(organizationRecord.metadata),
    name: organizationRecord.name,
    owners,
    slug: organizationRecord.slug,
  }
}

async function getOwnerCount(organizationId: string) {
  const members = await db
    .select({
      role: member.role,
    })
    .from(member)
    .where(eq(member.organizationId, organizationId))

  return members.filter((entry) => includesOwner(entry.role)).length
}

export const adminOrganizationRouter = {
  create: adminProcedure
    .input(
      z.object({
        logo: z.string().optional(),
        name: z.string().trim().min(1),
        ownerUserId: z.string().min(1),
        slug: z.string().trim().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingOrganization = await db
        .select({
          id: organization.id,
        })
        .from(organization)
        .where(eq(organization.slug, input.slug))
        .limit(1)

      if (existingOrganization.length > 0) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization slug is already taken.',
        })
      }

      const existingOwner = await db
        .select({
          id: user.id,
        })
        .from(user)
        .where(eq(user.id, input.ownerUserId))
        .limit(1)

      if (existingOwner.length === 0) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Owner user not found.',
        })
      }

      const createdOrganization = await auth.api.createOrganization({
        body: {
          logo: normalizeLogo(input.logo) ?? undefined,
          name: input.name,
          slug: input.slug,
          userId: input.ownerUserId,
        },
      })

      const detail = await getOrganizationDetail(createdOrganization.id)

      if (!detail) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Organization was created but could not be loaded.',
        })
      }

      return detail
    }),

  delete: adminProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingOrganization = await getOrganizationRecordById(input.organizationId)

      if (!existingOrganization) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      const organizationTeamIds = await db
        .select({
          id: team.id,
        })
        .from(team)
        .where(eq(team.organizationId, input.organizationId))
        .orderBy(asc(team.id))

      await db.transaction(async (tx) => {
        await tx.delete(communityManagedMember).where(eq(communityManagedMember.organizationId, input.organizationId))
        await tx.delete(invitation).where(eq(invitation.organizationId, input.organizationId))
        if (organizationTeamIds.length > 0) {
          await tx.delete(teamMember).where(
            inArray(
              teamMember.teamId,
              organizationTeamIds.map((teamRecord) => teamRecord.id),
            ),
          )
          await tx.delete(team).where(
            inArray(
              team.id,
              organizationTeamIds.map((teamRecord) => teamRecord.id),
            ),
          )
        }
        await tx.delete(member).where(eq(member.organizationId, input.organizationId))
        await tx.delete(organization).where(eq(organization.id, input.organizationId))
      })
      if (organizationTeamIds.length > 0) {
        await db
          .update(session)
          .set({
            activeOrganizationId: null,
            activeTeamId: null,
          })
          .where(
            or(
              eq(session.activeOrganizationId, input.organizationId),
              inArray(
                session.activeTeamId,
                organizationTeamIds.map((teamRecord) => teamRecord.id),
              ),
            ),
          )
      } else {
        await db
          .update(session)
          .set({
            activeOrganizationId: null,
            activeTeamId: null,
          })
          .where(eq(session.activeOrganizationId, input.organizationId))
      }

      return {
        organizationId: input.organizationId,
      }
    }),

  get: adminProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const detail = await getOrganizationDetail(input.organizationId)

      if (!detail) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      return detail
    }),

  list: adminProcedure.input(listOrganizationsInputSchema).handler(async ({ input }) => {
    const limit = input?.limit ?? 25
    const offset = input?.offset ?? 0
    const whereClause = getOrganizationFilter(input?.search)
    const organizations = whereClause
      ? await db
          .select({
            createdAt: organization.createdAt,
            id: organization.id,
            logo: organization.logo,
            metadata: organization.metadata,
            name: organization.name,
            slug: organization.slug,
          })
          .from(organization)
          .where(whereClause)
          .orderBy(asc(organization.name), asc(organization.slug))
          .limit(limit)
          .offset(offset)
      : await db
          .select({
            createdAt: organization.createdAt,
            id: organization.id,
            logo: organization.logo,
            metadata: organization.metadata,
            name: organization.name,
            slug: organization.slug,
          })
          .from(organization)
          .orderBy(asc(organization.name), asc(organization.slug))
          .limit(limit)
          .offset(offset)

    const [totalResult] = whereClause
      ? await db
          .select({
            count: count(),
          })
          .from(organization)
          .where(whereClause)
      : await db
          .select({
            count: count(),
          })
          .from(organization)
    const organizationIds = organizations.map((entry) => entry.id)
    const members =
      organizationIds.length === 0
        ? []
        : await db
            .select({
              createdAt: member.createdAt,
              id: member.id,
              name: user.name,
              organizationId: member.organizationId,
              role: member.role,
              userId: user.id,
              username: user.username,
            })
            .from(member)
            .innerJoin(user, eq(member.userId, user.id))
            .where(inArray(member.organizationId, organizationIds))
            .orderBy(asc(user.name), asc(user.username), asc(user.id))

    const membersByOrganizationId = new Map<string, typeof members>()

    for (const entry of members) {
      const existingMembers = membersByOrganizationId.get(entry.organizationId) ?? []
      membersByOrganizationId.set(entry.organizationId, [...existingMembers, entry])
    }

    return {
      limit,
      offset,
      organizations: organizations.map((entry) => {
        const organizationMembers = membersByOrganizationId.get(entry.id) ?? []

        return {
          createdAt: entry.createdAt,
          id: entry.id,
          logo: entry.logo,
          memberCount: organizationMembers.length,
          metadata: normalizeMetadata(entry.metadata),
          name: entry.name,
          owners: organizationMembers
            .filter((memberEntry) => includesOwner(memberEntry.role))
            .map((memberEntry) => ({
              name: memberEntry.name,
              userId: memberEntry.userId,
              username: memberEntry.username,
            })),
          slug: entry.slug,
        }
      }),
      total: totalResult?.count ?? 0,
    }
  }),

  listOwnerCandidates: adminProcedure.input(listOwnerCandidatesInputSchema).handler(async ({ input }) => {
    const limit = input?.limit ?? 10
    const whereClause = getUserFilter(input?.search)
    const query = db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
      })
      .from(user)
      .$dynamic()

    if (whereClause) {
      query.where(whereClause)
    }

    return await query.orderBy(asc(user.name), asc(user.username), asc(user.id)).limit(limit)
  }),

  removeMember: adminProcedure
    .input(
      z.object({
        memberId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const [existingMember] = await db
        .select({
          id: member.id,
          organizationId: member.organizationId,
          role: member.role,
          userId: member.userId,
        })
        .from(member)
        .where(eq(member.id, input.memberId))
        .limit(1)

      if (!existingMember) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Member not found.',
        })
      }

      if (includesOwner(existingMember.role)) {
        const ownerCount = await getOwnerCount(existingMember.organizationId)

        if (ownerCount <= 1) {
          throw new ORPCError('BAD_REQUEST', {
            message: 'You cannot remove the last owner from an organization.',
          })
        }
      }

      const organizationTeamIds = await db
        .select({
          id: team.id,
        })
        .from(team)
        .where(eq(team.organizationId, existingMember.organizationId))
        .orderBy(asc(team.id))

      await db.transaction(async (tx) => {
        await tx
          .delete(communityManagedMember)
          .where(
            and(
              eq(communityManagedMember.organizationId, existingMember.organizationId),
              eq(communityManagedMember.userId, existingMember.userId),
            ),
          )
        if (organizationTeamIds.length > 0) {
          await tx.delete(teamMember).where(
            and(
              eq(teamMember.userId, existingMember.userId),
              inArray(
                teamMember.teamId,
                organizationTeamIds.map((teamRecord) => teamRecord.id),
              ),
            ),
          )
        }
        await tx.delete(member).where(eq(member.id, input.memberId))
      })
      if (organizationTeamIds.length > 0) {
        await db
          .update(session)
          .set({
            activeOrganizationId: null,
            activeTeamId: null,
          })
          .where(
            and(
              eq(session.userId, existingMember.userId),
              or(
                eq(session.activeOrganizationId, existingMember.organizationId),
                inArray(
                  session.activeTeamId,
                  organizationTeamIds.map((teamRecord) => teamRecord.id),
                ),
              ),
            ),
          )
      } else {
        await db
          .update(session)
          .set({
            activeOrganizationId: null,
            activeTeamId: null,
          })
          .where(
            and(
              eq(session.userId, existingMember.userId),
              eq(session.activeOrganizationId, existingMember.organizationId),
            ),
          )
      }

      return {
        memberId: existingMember.id,
        organizationId: existingMember.organizationId,
        userId: existingMember.userId,
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        data: z.object({
          logo: z.string().optional(),
          name: z.string().trim().min(1),
          slug: z.string().trim().min(1),
        }),
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingOrganization = await getOrganizationRecordById(input.organizationId)

      if (!existingOrganization) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      const [conflictingSlug] =
        input.data.slug === existingOrganization.slug
          ? [null]
          : await db
              .select({
                id: organization.id,
              })
              .from(organization)
              .where(eq(organization.slug, input.data.slug))
              .limit(1)

      if (conflictingSlug && conflictingSlug.id !== input.organizationId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization slug is already taken.',
        })
      }

      await db
        .update(organization)
        .set({
          logo: normalizeLogo(input.data.logo),
          name: input.data.name,
          slug: input.data.slug,
        })
        .where(eq(organization.id, input.organizationId))

      const detail = await getOrganizationDetail(input.organizationId)

      if (!detail) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Organization was updated but could not be loaded.',
        })
      }

      return detail
    }),

  updateMemberRole: adminProcedure
    .input(
      z.object({
        memberId: z.string().min(1),
        role: memberRoleSchema,
      }),
    )
    .handler(async ({ input }) => {
      const [existingMember] = await db
        .select({
          id: member.id,
          organizationId: member.organizationId,
          role: member.role,
          userId: member.userId,
        })
        .from(member)
        .where(eq(member.id, input.memberId))
        .limit(1)

      if (!existingMember) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Member not found.',
        })
      }

      if (includesOwner(existingMember.role) && input.role !== 'owner') {
        const ownerCount = await getOwnerCount(existingMember.organizationId)

        if (ownerCount <= 1) {
          throw new ORPCError('BAD_REQUEST', {
            message: 'You cannot demote the last owner of an organization.',
          })
        }
      }

      await db
        .update(member)
        .set({
          role: input.role,
        })
        .where(eq(member.id, input.memberId))
      await db
        .delete(communityManagedMember)
        .where(
          and(
            eq(communityManagedMember.organizationId, existingMember.organizationId),
            eq(communityManagedMember.userId, existingMember.userId),
          ),
        )

      return {
        memberId: existingMember.id,
        organizationId: existingMember.organizationId,
        role: input.role,
      }
    }),
}
