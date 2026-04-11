import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserUpdate } from '../data-access/admin-user-update'
import { adminUserUpdateInputSchema } from '../data-access/admin-user-update-input-schema'

export const adminUserFeatureUpdate = adminProcedure
  .input(adminUserUpdateInputSchema)
  .handler(async ({ context, input }) => {
    const result = await adminUserUpdate({
      data: input.data,
      requestHeaders: context.requestHeaders,
      userId: input.userId,
    })

    if (result.status === 'user-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found.',
      })
    }

    if (result.status === 'user-updated-but-not-loaded') {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'User was updated but could not be loaded.',
      })
    }

    return result.user
  })
