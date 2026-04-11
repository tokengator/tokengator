import type z from 'zod'

import { adminUserListAssetsInputSchema } from './admin-user-list-assets-input-schema'

export type AdminUserListAssetsInput = z.infer<typeof adminUserListAssetsInputSchema>
