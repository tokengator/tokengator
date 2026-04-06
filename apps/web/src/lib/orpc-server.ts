import { getRequestHeaders } from '@tanstack/react-start/server'
import { env } from '@tokengator/env/web'
import { createOrpcClient } from '@tokengator/sdk'

export const serverOrpcClient = createOrpcClient({
  baseUrl: env.VITE_API_URL_SERVER,
  headers: () => getRequestHeaders(),
})
