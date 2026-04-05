import { z } from 'zod'
import { APP_DEBUG_CATEGORY_VALUES } from '@tokengator/logger/debug-categories'

import { parseStringList } from './server-env-list'

export const logDebugCategoriesSchema = z
  .string()
  .optional()
  .transform(parseStringList)
  .pipe(z.array(z.enum(APP_DEBUG_CATEGORY_VALUES)))
