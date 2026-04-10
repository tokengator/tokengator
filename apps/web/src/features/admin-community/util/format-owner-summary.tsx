import type { AdminOrganizationOwnerEntity } from '@tokengator/sdk'

export function formatOwnerSummary(owner: Pick<AdminOrganizationOwnerEntity, 'name' | 'username'>) {
  return owner.username ? `${owner.name} (@${owner.username})` : owner.name
}
