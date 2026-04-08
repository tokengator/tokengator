function assertValidUrl(name: string, value: string) {
  try {
    new URL(value)
  } catch {
    throw new Error(`Invalid ${name}`)
  }

  return value
}

function getServerApiUrl() {
  const value = process.env.VITE_API_URL ?? process.env.BETTER_AUTH_URL ?? import.meta.env.VITE_API_URL

  if (!value) {
    throw new Error('Missing VITE_API_URL or BETTER_AUTH_URL')
  }

  return assertValidUrl('VITE_API_URL or BETTER_AUTH_URL', value)
}

function getApiUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return getServerApiUrl()
}

export const env = {
  VITE_API_URL: getApiUrl(),
} as const
