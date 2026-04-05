import { db } from '@tokengator/db'
import { shouldStartDiscord, startDiscordBot } from '@tokengator/discord'
import { env } from '@tokengator/env/discord'

type DiscordBotRuntime = Awaited<ReturnType<typeof startDiscordBot>>

declare global {
  // Prevent duplicate Discord clients when Bun hot-reloads this module.
  var __tokengatorDiscordBotRuntime: Promise<DiscordBotRuntime> | undefined
}

function createDiscordBotRuntimePromise() {
  return startDiscordBot({ db, env }).catch((error) => {
    globalThis.__tokengatorDiscordBotRuntime = undefined

    throw error
  })
}

export async function startApiDiscordBot() {
  if (!shouldStartDiscord({ env })) {
    return
  }

  globalThis.__tokengatorDiscordBotRuntime ??= createDiscordBotRuntimePromise()

  await globalThis.__tokengatorDiscordBotRuntime
}
