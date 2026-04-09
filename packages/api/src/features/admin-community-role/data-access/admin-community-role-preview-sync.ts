import { previewCommunityRoleSync } from '../../../features/community-role-sync'

export async function adminCommunityRolePreviewSync(organizationId: string) {
  return await previewCommunityRoleSync(organizationId)
}
