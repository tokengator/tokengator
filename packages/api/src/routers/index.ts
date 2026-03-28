import type { RouterClient } from '@orpc/server'
import { env } from '@tokengator/env/api'

import { protectedProcedure, publicProcedure } from '../index'
import { adminOrganizationRouter } from './admin-organization'
import { adminTodoRouter } from './admin-todo'
import { organizationRouter } from './organization'
import { profileRouter } from './profile'
import { todoRouter } from './todo'

export const appRouter = {
  adminOrganization: adminOrganizationRouter,
  adminTodo: adminTodoRouter,
  appConfig: publicProcedure.handler(() => {
    return {
      solanaCluster: env.SOLANA_CLUSTER,
      solanaEndpoint: env.SOLANA_ENDPOINT_PUBLIC,
      solanaSignInEnabled: env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED,
    }
  }),
  healthCheck: publicProcedure.handler(() => {
    return 'OK'
  }),
  organization: organizationRouter,
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: 'This is private',
      user: context.session?.user,
    }
  }),
  profile: profileRouter,
  todo: todoRouter,
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
