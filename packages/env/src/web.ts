function assertValidUrl(value: string, name: string) {
  try {
    new URL(value)
  } catch {
    throw new Error(`Invalid ${name}`)
  }

  return value
}

function getServerApiUrl() {
  const value = process.env.VITE_API_URL ?? import.meta.env.VITE_API_URL

  if (!value) {
    throw new Error('Missing VITE_API_URL')
  }

  return assertValidUrl(value, 'VITE_API_URL')
}

function getBrowserApiUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}`
  }

  return getServerApiUrl()
}

export const env = {
  VITE_API_URL: getBrowserApiUrl(),
  VITE_API_URL_SERVER: getServerApiUrl(),
} as const
