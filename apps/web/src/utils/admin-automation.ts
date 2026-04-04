import type { UiStatusVariants } from '@tokengator/ui/components/ui-status'

export function formatTimestamp(value: Date | string | null) {
  if (!value) {
    return 'Never'
  }

  return new Date(value).toLocaleString()
}

export function getFreshnessTone(status: 'fresh' | 'stale' | 'unknown'): UiStatusVariants['tone'] {
  if (status === 'fresh') {
    return 'success'
  }

  if (status === 'stale') {
    return 'warning'
  }

  return 'default'
}
