import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserGet } from '../data-access/admin-user-get'
import { adminUserGetInputSchema } from '../data-access/admin-user-get-input-schema'

export const adminUserFeatureGet = adminProcedure.input(adminUserGetInputSchema).handler(async ({ input }) => {
  const user = await adminUserGet(input.userId)

  if (!user) {
    throw new ORPCError('NOT_FOUND', {
      message: 'User not found.',
    })
  }

  return user
})
