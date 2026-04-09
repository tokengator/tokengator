import { asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'
import { team, teamMember } from '@tokengator/db/schema/auth'
import { communityRole, communityRoleCondition } from '@tokengator/db/schema/community-role'

import type { AdminCommunityRoleEntity } from './admin-community-role.entity'

export async function adminCommunityRoleEntityGet(communityRoleId: string): Promise<AdminCommunityRoleEntity | null> {
  const [roleRecord] = await db
    .select({
      createdAt: communityRole.createdAt,
      discordRoleId: communityRole.discordRoleId,
      enabled: communityRole.enabled,
      id: communityRole.id,
      matchMode: communityRole.matchMode,
      name: communityRole.name,
      organizationId: communityRole.organizationId,
      slug: communityRole.slug,
      teamId: communityRole.teamId,
      teamName: team.name,
      updatedAt: communityRole.updatedAt,
    })
    .from(communityRole)
    .innerJoin(team, eq(communityRole.teamId, team.id))
    .where(eq(communityRole.id, communityRoleId))
    .limit(1)

  if (!roleRecord) {
    return null
  }

  const [conditionRows, teamMembershipRows] = await Promise.all([
    db
      .select({
        assetGroupAddress: assetGroup.address,
        assetGroupEnabled: assetGroup.enabled,
        assetGroupId: communityRoleCondition.assetGroupId,
        assetGroupLabel: assetGroup.label,
        assetGroupType: assetGroup.type,
        id: communityRoleCondition.id,
        maximumAmount: communityRoleCondition.maximumAmount,
        minimumAmount: communityRoleCondition.minimumAmount,
      })
      .from(communityRoleCondition)
      .innerJoin(assetGroup, eq(communityRoleCondition.assetGroupId, assetGroup.id))
      .where(eq(communityRoleCondition.communityRoleId, communityRoleId))
      .orderBy(asc(assetGroup.label), asc(assetGroup.type), asc(assetGroup.address), asc(communityRoleCondition.id)),
    db
      .select({
        teamId: teamMember.teamId,
      })
      .from(teamMember)
      .where(eq(teamMember.teamId, roleRecord.teamId))
      .orderBy(asc(teamMember.teamId)),
  ])

  return {
    conditions: conditionRows.map((condition) => ({
      assetGroupAddress: condition.assetGroupAddress,
      assetGroupEnabled: condition.assetGroupEnabled,
      assetGroupId: condition.assetGroupId,
      assetGroupLabel: condition.assetGroupLabel,
      assetGroupType: condition.assetGroupType,
      id: condition.id,
      maximumAmount: condition.maximumAmount,
      minimumAmount: condition.minimumAmount,
    })),
    createdAt: roleRecord.createdAt,
    discordRoleId: roleRecord.discordRoleId,
    enabled: roleRecord.enabled,
    id: roleRecord.id,
    matchMode: roleRecord.matchMode,
    name: roleRecord.name,
    organizationId: roleRecord.organizationId,
    slug: roleRecord.slug,
    teamId: roleRecord.teamId,
    teamMemberCount: teamMembershipRows.length,
    teamName: roleRecord.teamName,
    updatedAt: roleRecord.updatedAt,
  }
}
