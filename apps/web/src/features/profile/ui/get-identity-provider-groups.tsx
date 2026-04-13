import type { IdentityProvider, ProfileIdentityEntity } from '@tokengator/sdk'

const providerOrder: IdentityProvider[] = ['discord', 'solana']

export interface IdentityProviderGroup {
  identities: ProfileIdentityEntity[]
  provider: IdentityProvider
}

export function getIdentityProviderGroups(
  identities: ProfileIdentityEntity[],
  options?: {
    includeProviders?: IdentityProvider[]
  },
): IdentityProviderGroup[] {
  const identitiesByProvider = new Map<IdentityProvider, ProfileIdentityEntity[]>()

  for (const identity of identities) {
    const groupedIdentities = identitiesByProvider.get(identity.provider)

    if (groupedIdentities) {
      groupedIdentities.push(identity)
      continue
    }

    identitiesByProvider.set(identity.provider, [identity])
  }

  const sortedProviders = [...new Set([...identitiesByProvider.keys(), ...(options?.includeProviders ?? [])])].sort(
    (leftProvider, rightProvider) => {
      const leftIndex = providerOrder.indexOf(leftProvider)
      const rightIndex = providerOrder.indexOf(rightProvider)

      if (leftIndex !== -1 && rightIndex !== -1) {
        return leftIndex - rightIndex
      }

      if (leftIndex !== -1) {
        return -1
      }

      if (rightIndex !== -1) {
        return 1
      }

      return leftProvider.localeCompare(rightProvider)
    },
  )

  return sortedProviders.map((provider) => ({
    identities: identitiesByProvider.get(provider) ?? [],
    provider,
  }))
}
