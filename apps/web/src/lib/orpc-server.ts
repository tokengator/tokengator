import { getRequestHeaders } from '@tanstack/react-start/server'
import { env } from '@tokengator/env/web-server'
import { createOrpcClient } from '@tokengator/sdk'

export const serverOrpcClient = createOrpcClient({
  baseUrl: env.API_URL,
  headers: () => getRequestHeaders(),
})
