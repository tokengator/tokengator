import type { RouterClient } from '@orpc/server'
import { env } from '@tokengator/env/api'

import { protectedProcedure, publicProcedure } from '../index'
import { adminAssetRouter } from './admin-asset'
import { adminAssetGroupRouter } from './admin-asset-group'
import { adminCommunityRoleRouter } from './admin-community-role'
import { adminOrganizationRouter } from './admin-organization'
import { organizationRouter } from './organization'
import { profileRouter } from './profile'

function getAppConfig() {
  return {
    solanaCluster: env.SOLANA_CLUSTER,
    solanaEndpoint: env.SOLANA_ENDPOINT_PUBLIC,
    solanaSignInEnabled: env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED,
  }
}

export type AppConfig = ReturnType<typeof getAppConfig>

export const appRouter = {
  adminAsset: adminAssetRouter,
  adminAssetGroup: adminAssetGroupRouter,
  adminCommunityRole: adminCommunityRoleRouter,
  adminOrganization: adminOrganizationRouter,
  appConfig: publicProcedure.handler(() => getAppConfig()),
  healthCheck: publicProcedure.handler(() => {
    return 'OK'
  }),
  organization: organizationRouter,
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: 'This is private',
      user: context.session?.user
        ? {
            id: context.session.user.id,
            name: context.session.user.name,
            role: context.session.user.role,
            username: context.session.user.username,
          }
        : null,
    }
  }),
  profile: profileRouter,
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
