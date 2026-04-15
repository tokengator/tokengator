import { adminProcedure } from '../../../lib/procedures'

export const devFeatureUptime = adminProcedure.handler(() => {
  return {
    uptime: process.uptime(),
  }
})
