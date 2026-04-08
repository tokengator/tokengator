import { useShellHealthCheckQuery } from '@/features/shell/data-access/use-shell-health-check-query.tsx'

export type HealthCheckStatus = 'connected' | 'disconnected' | 'loading'
export function useShellHealthCheckStatus(): HealthCheckStatus {
  const healthCheck = useShellHealthCheckQuery()

  return healthCheck.isLoading
    ? 'loading'
    : healthCheck.isError
      ? 'disconnected'
      : healthCheck.data
        ? 'connected'
        : 'disconnected'
}
