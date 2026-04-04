import { useQuery } from '@tanstack/react-query'
import { cn } from '@tokengator/ui/lib/utils'

import { orpc } from '@/utils/orpc'

export function ApiStatusIndicator() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions())

  const label = healthCheck.isLoading ? 'Checking API status' : healthCheck.data ? 'API connected' : 'API disconnected'

  return (
    <div aria-label={label} role="status" title={label}>
      <div
        aria-hidden="true"
        className={cn(
          'size-2.5 rounded-full',
          healthCheck.isLoading ? 'bg-muted-foreground/50' : healthCheck.data ? 'bg-green-500' : 'bg-destructive',
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
