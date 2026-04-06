function getViteApiUrl() {
  const value = import.meta.env.VITE_API_URL

  if (!value) {
    throw new Error('Missing VITE_API_URL')
  }

  try {
    new URL(value)
  } catch {
    throw new Error('Invalid VITE_API_URL')
  }

  return value
}

export const env = {
  VITE_API_URL: getViteApiUrl(),
} as const
