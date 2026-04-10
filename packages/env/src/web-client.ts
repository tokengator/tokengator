function getApiUrl() {
  if (typeof window === 'undefined') {
    throw new Error('API_URL is only available in the browser.')
  }

  return window.location.origin
}

export const env = {
  get API_URL() {
    return getApiUrl()
  },
} as const
