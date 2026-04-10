import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { authClientServer } from './auth-client-server'

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const headers = new Headers(getRequestHeaders())

  request.headers.forEach((value, key) => {
    if (!headers.has(key)) {
      headers.set(key, value)
    }
  })

  const session = await authClientServer.getSession({
    fetchOptions: {
      headers,
      throw: true,
    },
  })

  return next({
    context: { session },
  })
})
