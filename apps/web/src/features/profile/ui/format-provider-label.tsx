import type { IdentityProvider } from '@tokengator/sdk'

export function formatProviderLabel(provider: IdentityProvider) {
  switch (provider) {
    case 'discord':
      return 'Discord'
    case 'solana':
      return 'Solana'
    default:
      return provider
  }
}
