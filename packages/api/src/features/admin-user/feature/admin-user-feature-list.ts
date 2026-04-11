import { adminProcedure } from '../../../lib/procedures'

import { adminUserList } from '../data-access/admin-user-list'
import { adminUserListInputSchema } from '../data-access/admin-user-list-input-schema'

export const adminUserFeatureList = adminProcedure.input(adminUserListInputSchema).handler(async ({ input }) => {
  return await adminUserList(input)
})
