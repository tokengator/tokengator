import z from 'zod'

import { profileSolanaWalletDeleteInputSchema } from './profile-solana-wallet-delete-input-schema'

export type ProfileSolanaWalletDeleteInput = z.infer<typeof profileSolanaWalletDeleteInputSchema>
