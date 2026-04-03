export function formatTimestamp(value: Date | string | null) {
  if (!value) {
    return 'Never'
  }

  return new Date(value).toLocaleString()
}

export function getFreshnessClassName(status: 'fresh' | 'stale' | 'unknown') {
  if (status === 'fresh') {
    return 'border border-emerald-600/30 bg-emerald-600/10 px-2 py-1 text-xs font-medium text-emerald-700'
  }

  if (status === 'stale') {
    return 'border border-amber-600/30 bg-amber-600/10 px-2 py-1 text-xs font-medium text-amber-700'
  }

  return 'border px-2 py-1 text-xs font-medium'
}
