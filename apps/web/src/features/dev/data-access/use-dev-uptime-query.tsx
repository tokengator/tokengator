import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useDevUptimeQuery() {
  return useQuery({
    ...orpc.dev.uptime.queryOptions(),
    enabled: typeof window !== 'undefined',
  })
}
