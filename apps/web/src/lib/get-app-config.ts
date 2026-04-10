export async function getAppConfig() {
  if (typeof window !== 'undefined') {
    const { getAppConfigClient } = await import('./get-app-config-client')

    return getAppConfigClient()
  }

  const { getAppConfigServer } = await import('./get-app-config-server')

  return getAppConfigServer()
}
