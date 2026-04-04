import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { authClient } from './auth-client'

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const headers = new Headers(getRequestHeaders())

  request.headers.forEach((value, key) => {
    if (!headers.has(key)) {
      headers.set(key, value)
    }
  })

  const session = await authClient.getSession({
    fetchOptions: {
      headers,
      throw: true,
    },
  })

  return next({
    context: { session },
  })
})
