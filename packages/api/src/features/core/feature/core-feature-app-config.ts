import { publicProcedure } from '../../../lib/procedures'
import { getCoreAppConfig } from '../data-access/get-core-app-config'

export const coreFeatureAppConfig = publicProcedure.handler(() => getCoreAppConfig())
