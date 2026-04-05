import { createApiApp } from '@tokengator/api/app'
import { db } from '@tokengator/db'
import { shouldStartDiscord, startDiscordBot } from '@tokengator/discord'
import { env as apiEnv } from '@tokengator/env/api'
import { env as discordEnv } from '@tokengator/env/discord'
import { configureAppLogger } from '@tokengator/logger'

type DiscordBotRuntime = Awaited<ReturnType<typeof startDiscordBot>>

declare global {
  // Prevent duplicate Discord clients when Bun hot-reloads this module.
  var __tokengatorDiscordBotRuntime: Promise<DiscordBotRuntime> | undefined
}

configureAppLogger({ env: apiEnv })

const app = createApiApp()

app.get('/', (c) => {
  return c.text('OK')
})

function createDiscordBotRuntimePromise() {
  return startDiscordBot({ db, env: discordEnv }).catch((error) => {
    globalThis.__tokengatorDiscordBotRuntime = undefined

    throw error
  })
}

if (shouldStartDiscord({ env: discordEnv })) {
  globalThis.__tokengatorDiscordBotRuntime ??= createDiscordBotRuntimePromise()

  await globalThis.__tokengatorDiscordBotRuntime
}

export default app
