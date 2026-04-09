import { env } from '@tokengator/env/api'

import { publicProcedure } from '../../../lib/procedures'

function getAppConfig() {
  return {
    solanaCluster: env.SOLANA_CLUSTER,
    solanaEndpoint: env.SOLANA_ENDPOINT_PUBLIC,
    solanaSignInEnabled: env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED,
  }
}

export type AppConfig = ReturnType<typeof getAppConfig>

export const coreFeatureAppConfig = publicProcedure.handler(() => getAppConfig())
