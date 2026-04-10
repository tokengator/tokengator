import type { AppConfig } from '@tokengator/sdk'

export function getAppConfigClient(): AppConfig {
  const appConfig = globalThis.__env

  if (!appConfig) {
    throw new Error('Missing globalThis.__env. Expected /api/__/env.js to load before the app.')
  }

  return appConfig
}
