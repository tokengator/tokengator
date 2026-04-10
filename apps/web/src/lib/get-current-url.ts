export async function getCurrentUrl() {
  if (import.meta.env.SSR) {
    return (await import('./get-current-url-server')).getCurrentUrlServer()
  }

  return (await import('./get-current-url-client')).getCurrentUrlClient()
}
