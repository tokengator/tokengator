import type z from 'zod'

import { adminUserGetInputSchema } from './admin-user-get-input-schema'

export type AdminUserGetInput = z.infer<typeof adminUserGetInputSchema>
