import { address, isAddress } from '@solana/kit'
import z from 'zod'

export const solanaAddressSchema = z
  .string()
  .trim()
  .refine((val) => Boolean(isAddress(val)), { message: 'Invalid Solana address' })
  .transform((val): string => address(val))

export const adminAssetGroupLookupInputSchema = z.object({
  address: solanaAddressSchema,
})

export type AdminAssetGroupLookupInput = z.infer<typeof adminAssetGroupLookupInputSchema>
