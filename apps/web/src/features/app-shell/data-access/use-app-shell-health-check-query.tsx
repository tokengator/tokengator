import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useAppShellHealthCheckQuery() {
  return useQuery(orpc.healthCheck.queryOptions())
}
