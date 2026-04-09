import z from 'zod'

import { profileSolanaWalletUpdateInputSchema } from './profile-solana-wallet-update-input-schema'

export type ProfileSolanaWalletUpdateInput = z.infer<typeof profileSolanaWalletUpdateInputSchema>
