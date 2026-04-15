import { ORPCError } from '@orpc/server'
import { env } from '@tokengator/env/api'

import { adminProcedure } from '../../../lib/procedures'

import { adminAssetGroupGetByAddress } from '../data-access/admin-asset-group-get-by-address'
import { lookupAdminAssetGroup } from '../data-access/admin-asset-group-lookup'
import { adminAssetGroupLookupInputSchema } from '../data-access/admin-asset-group-lookup-input-schema'

export const adminAssetGroupFeatureLookup = adminProcedure
  .input(adminAssetGroupLookupInputSchema)
  .handler(async ({ context, input }) => {
    try {
      const lookup = await lookupAdminAssetGroup({
        account: input.address,
        apiKey: env.HELIUS_API_KEY,
        cluster: env.HELIUS_CLUSTER,
        signal: context.requestSignal,
      })
      const existingAssetGroup = lookup.suggestion.address
        ? await adminAssetGroupGetByAddress(lookup.suggestion.address)
        : null

      return {
        ...lookup,
        existingAssetGroup,
      }
    } catch (error) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: error instanceof Error ? error.message : 'Asset group lookup failed.',
      })
    }
  })
