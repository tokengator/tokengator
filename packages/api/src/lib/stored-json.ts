export function parseStoredJson<T>(value: string | null): T | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function parseStoredJsonOrValue(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function serializeJson(value: unknown) {
  if (value == null) {
    return null
  }

  return JSON.stringify(value)
}
