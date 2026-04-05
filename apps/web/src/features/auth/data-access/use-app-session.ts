import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'

export function useAppSession() {
  const query = useAppAuthStateQuery()

  return {
    ...query,
    data: query.data?.session ?? null,
  }
}
