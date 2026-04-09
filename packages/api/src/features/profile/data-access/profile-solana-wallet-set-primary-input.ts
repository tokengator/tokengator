import z from 'zod'

import { profileSolanaWalletSetPrimaryInputSchema } from './profile-solana-wallet-set-primary-input-schema'

export type ProfileSolanaWalletSetPrimaryInput = z.infer<typeof profileSolanaWalletSetPrimaryInputSchema>
