import type { Context as HonoContext } from 'hono'
import { auth } from '@tokengator/auth'
import { getDb, type Database } from '@tokengator/db'

export type CreateContextOptions = {
  context: HonoContext
  db?: Database
}

export async function createContext({ context, db }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  })

  return {
    db: db ?? getDb(),
    requestHeaders: context.req.raw.headers,
    requestSignal: context.req.raw.signal,
    responseHeaders: new Headers(),
    session,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
