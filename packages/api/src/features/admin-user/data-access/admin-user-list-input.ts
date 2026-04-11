import type z from 'zod'

import { adminUserListInputSchema } from './admin-user-list-input-schema'

export type AdminUserListInput = z.infer<typeof adminUserListInputSchema>
