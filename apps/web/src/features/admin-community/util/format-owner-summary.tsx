import type { AppSessionUser } from '@/features/auth/data-access/get-app-auth-state'

export function formatOwnerSummary(owner: Pick<AppSessionUser, 'name' | 'username'>) {
  return owner.username ? `${owner.name} (@${owner.username})` : owner.name
}
