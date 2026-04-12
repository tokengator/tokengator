import { profileFeatureDeleteSolanaWallet } from './profile-feature-delete-solana-wallet'
import { profileFeatureFinalizeDiscordAuth } from './profile-feature-finalize-discord-auth'
import { profileFeatureGetByUsername } from './profile-feature-get-by-username'
import { profileFeatureGetSettings } from './profile-feature-get-settings'
import { profileFeatureListCommunitiesByUsername } from './profile-feature-list-communities-by-username'
import { profileFeatureListIdentities } from './profile-feature-list-identities'
import { profileFeatureListIdentitiesByUsername } from './profile-feature-list-identities-by-username'
import { profileFeatureListSolanaWallets } from './profile-feature-list-solana-wallets'
import { profileFeatureSetPrimarySolanaWallet } from './profile-feature-set-primary-solana-wallet'
import { profileFeatureUpdateSettings } from './profile-feature-update-settings'
import { profileFeatureUpdateSolanaWallet } from './profile-feature-update-solana-wallet'

export const profileRouter = {
  deleteSolanaWallet: profileFeatureDeleteSolanaWallet,
  finalizeDiscordAuth: profileFeatureFinalizeDiscordAuth,
  getByUsername: profileFeatureGetByUsername,
  getSettings: profileFeatureGetSettings,
  listCommunitiesByUsername: profileFeatureListCommunitiesByUsername,
  listIdentities: profileFeatureListIdentities,
  listIdentitiesByUsername: profileFeatureListIdentitiesByUsername,
  listSolanaWallets: profileFeatureListSolanaWallets,
  setPrimarySolanaWallet: profileFeatureSetPrimarySolanaWallet,
  updateSettings: profileFeatureUpdateSettings,
  updateSolanaWallet: profileFeatureUpdateSolanaWallet,
}
