import { devFeatureEcho } from './dev-feature-echo'
import { devFeatureUptime } from './dev-feature-uptime'

export const devRouter = {
  echo: devFeatureEcho,
  uptime: devFeatureUptime,
}
