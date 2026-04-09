import { getCommunityRoleSyncStatus } from '../../../features/community-role-sync'

export async function adminCommunityRoleGetSyncStatus(organizationId: string) {
  return await getCommunityRoleSyncStatus({
    organizationId,
  })
}
