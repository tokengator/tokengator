export function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString()
}
