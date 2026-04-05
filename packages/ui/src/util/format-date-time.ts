export function formatDateTime(value: Date | string | null) {
  if (value === null) {
    return 'Never'
  }
  return new Date(value).toLocaleString()
}
