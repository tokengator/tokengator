import type { AppConfig } from '@tokengator/sdk'
import { env } from '@tokengator/env/web-server'

export async function getAppConfigServer(): Promise<AppConfig> {
  const response = await fetch(new URL('/api/__/env.json', env.API_URL))

  if (!response.ok) {
    throw new Error(`Failed to load app config from /api/__/env.json: ${response.status}`)
  }

  return (await response.json()) as AppConfig
}
