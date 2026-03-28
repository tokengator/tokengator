export function parseNonNegativeInteger(value: unknown, fallback: number) {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback
}

export function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}
