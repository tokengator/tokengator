import { getRequestUrl } from '@tanstack/react-start/server'

export function getCurrentUrlServer() {
  return getRequestUrl()
}
