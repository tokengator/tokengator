import type z from 'zod'

import { adminUserUpdateInputSchema } from './admin-user-update-input-schema'

export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateInputSchema>
