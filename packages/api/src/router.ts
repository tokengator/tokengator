import type { RouterClient } from '@orpc/server'

import { adminAssetGroupRouter } from './features/admin-asset-group/feature/admin-asset-group-router'
import { adminAssetRouter } from './features/admin-asset/feature/admin-asset-router'
import { adminCommunityRoleRouter } from './features/admin-community-role/feature/admin-community-role-router'
import { adminOrganizationRouter } from './features/admin-organization/feature/admin-organization-router'
import { adminUserRouter } from './features/admin-user/feature/admin-user-router'
import { communityRouter } from './features/community/feature/community-router'
import { coreRouter } from './features/core/feature/core-router'
import { organizationRouter } from './features/organization/feature/organization-router'
import { profileRouter } from './features/profile/feature/profile-router'

export const appRouter = {
  adminAsset: adminAssetRouter,
  adminAssetGroup: adminAssetGroupRouter,
  adminCommunityRole: adminCommunityRoleRouter,
  adminOrganization: adminOrganizationRouter,
  adminUser: adminUserRouter,
  community: communityRouter,
  core: coreRouter,
  organization: organizationRouter,
  profile: profileRouter,
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
