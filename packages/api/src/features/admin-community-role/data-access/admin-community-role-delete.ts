import { removeCommunityRoleById } from '../../../features/community-role-sync'

export async function adminCommunityRoleDelete(communityRoleId: string) {
  const deletedCommunityRole = await removeCommunityRoleById(communityRoleId)

  if (!deletedCommunityRole) {
    return null
  }

  return {
    communityRoleId: deletedCommunityRole.id,
    organizationId: deletedCommunityRole.organizationId,
  }
}
