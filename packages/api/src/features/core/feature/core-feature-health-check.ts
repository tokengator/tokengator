import { publicProcedure } from '../../../lib/procedures'

export const coreFeatureHealthCheck = publicProcedure.handler(() => 'OK')
