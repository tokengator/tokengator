import type { UiStatusVariants } from '@tokengator/ui/components/ui-status'

export function getFreshnessTone(status: 'fresh' | 'stale' | 'unknown'): UiStatusVariants['tone'] {
  if (status === 'fresh') {
    return 'success'
  }

  if (status === 'stale') {
    return 'warning'
  }

  return 'default'
}
