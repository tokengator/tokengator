import { coreFeatureAppConfig } from './core-feature-app-config'
import { coreFeatureHealthCheck } from './core-feature-health-check'

export const coreRouter = {
  appConfig: coreFeatureAppConfig,
  healthCheck: coreFeatureHealthCheck,
}
