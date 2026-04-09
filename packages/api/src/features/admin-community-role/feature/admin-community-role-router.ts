import { adminCommunityRoleFeatureApplyDiscordRoleSync } from './admin-community-role-feature-apply-discord-role-sync'
import { adminCommunityRoleFeatureApplySync } from './admin-community-role-feature-apply-sync'
import { adminCommunityRoleFeatureCreate } from './admin-community-role-feature-create'
import { adminCommunityRoleFeatureDelete } from './admin-community-role-feature-delete'
import { adminCommunityRoleFeatureGetSyncStatus } from './admin-community-role-feature-get-sync-status'
import { adminCommunityRoleFeatureList } from './admin-community-role-feature-list'
import { adminCommunityRoleFeatureListDiscordGuildRoles } from './admin-community-role-feature-list-discord-guild-roles'
import { adminCommunityRoleFeatureListRuns } from './admin-community-role-feature-list-runs'
import { adminCommunityRoleFeaturePreviewDiscordRoleSync } from './admin-community-role-feature-preview-discord-role-sync'
import { adminCommunityRoleFeaturePreviewSync } from './admin-community-role-feature-preview-sync'
import { adminCommunityRoleFeatureSetDiscordRoleMapping } from './admin-community-role-feature-set-discord-role-mapping'
import { adminCommunityRoleFeatureUpdate } from './admin-community-role-feature-update'

export const adminCommunityRoleRouter = {
  applyDiscordRoleSync: adminCommunityRoleFeatureApplyDiscordRoleSync,
  applySync: adminCommunityRoleFeatureApplySync,
  create: adminCommunityRoleFeatureCreate,
  delete: adminCommunityRoleFeatureDelete,
  getSyncStatus: adminCommunityRoleFeatureGetSyncStatus,
  list: adminCommunityRoleFeatureList,
  listDiscordGuildRoles: adminCommunityRoleFeatureListDiscordGuildRoles,
  listRuns: adminCommunityRoleFeatureListRuns,
  previewDiscordRoleSync: adminCommunityRoleFeaturePreviewDiscordRoleSync,
  previewSync: adminCommunityRoleFeaturePreviewSync,
  setDiscordRoleMapping: adminCommunityRoleFeatureSetDiscordRoleMapping,
  update: adminCommunityRoleFeatureUpdate,
}
