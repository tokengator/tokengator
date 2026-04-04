export function formatDateTime(value: Date | string | null) {
  if (!value) {
    return 'Never'
  }
  return new Date(value).toLocaleString()
}
