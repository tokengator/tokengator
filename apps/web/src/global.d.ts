import type { AppConfig } from '@tokengator/sdk'

declare global {
  var __env: AppConfig | undefined
}

export {}
