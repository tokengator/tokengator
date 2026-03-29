function parseCommaSeparatedEnvList({
  normalize = (value) => value,
  value,
}: {
  normalize?: (value: string) => string
  value?: string
}) {
  if (!value) {
    return []
  }

  return [
    ...new Set(
      value
        .split(',')
        .map((entry) => normalize(entry.trim()))
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right))
}

export function parseAdminEmailPatterns(value?: string) {
  return parseCommaSeparatedEnvList({
    normalize: (entry) => entry.toLowerCase(),
    value,
  })
}

export function parseStringList(value?: string) {
  return parseCommaSeparatedEnvList({
    value,
  })
}
