import { profileFeatureDeleteSolanaWallet } from './profile-feature-delete-solana-wallet'
import { profileFeatureFinalizeDiscordAuth } from './profile-feature-finalize-discord-auth'
import { profileFeatureListIdentities } from './profile-feature-list-identities'
import { profileFeatureListSolanaWallets } from './profile-feature-list-solana-wallets'
import { profileFeatureSetPrimarySolanaWallet } from './profile-feature-set-primary-solana-wallet'
import { profileFeatureUpdateSolanaWallet } from './profile-feature-update-solana-wallet'

export const profileRouter = {
  deleteSolanaWallet: profileFeatureDeleteSolanaWallet,
  finalizeDiscordAuth: profileFeatureFinalizeDiscordAuth,
  listIdentities: profileFeatureListIdentities,
  listSolanaWallets: profileFeatureListSolanaWallets,
  setPrimarySolanaWallet: profileFeatureSetPrimarySolanaWallet,
  updateSolanaWallet: profileFeatureUpdateSolanaWallet,
}
