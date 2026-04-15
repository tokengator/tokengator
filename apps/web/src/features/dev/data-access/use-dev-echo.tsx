import { useMutation } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export function useDevEcho() {
  return useMutation(orpc.dev.echo.mutationOptions())
}
