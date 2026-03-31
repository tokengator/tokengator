import { createApiApp } from '@tokengator/api/app'
import { shouldStartDiscord, startDiscordBot } from '@tokengator/discord'

type DiscordBotRuntime = Awaited<ReturnType<typeof startDiscordBot>>

declare global {
  // Prevent duplicate Discord clients when Bun hot-reloads this module.
  var __tokengatorDiscordBotRuntime: Promise<DiscordBotRuntime> | undefined
}

const app = createApiApp()

app.get('/', (c) => {
  return c.text('OK')
})

function createDiscordBotRuntimePromise() {
  return startDiscordBot().catch((error) => {
    globalThis.__tokengatorDiscordBotRuntime = undefined

    throw error
  })
}

if (shouldStartDiscord()) {
  globalThis.__tokengatorDiscordBotRuntime ??= createDiscordBotRuntimePromise()

  await globalThis.__tokengatorDiscordBotRuntime
}

export default app
