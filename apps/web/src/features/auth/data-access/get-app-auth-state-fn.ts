import { createServerFn } from '@tanstack/react-start'

import { authMiddleware } from './auth-middleware'
import { loadAppAuthState } from './load-app-auth-state'

export const getAppAuthState = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => await loadAppAuthState({ session: context.session }))
