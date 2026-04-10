import type { AppConfig } from './get-core-app-config'

export function getCoreEnvJs(appConfig: AppConfig) {
  return `globalThis.__env = ${JSON.stringify(appConfig)};\n`
}
