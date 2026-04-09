import { ansiColorFormatter, configureSync, getConsoleSink, getLogger, jsonLinesFormatter } from '@logtape/logtape'

import { APP_DEBUG_CATEGORY_VALUES, type AppDebugCategory } from './debug-categories'

const DEFAULT_ROOT_CATEGORY = ['tokengator']
const DEFAULT_DEBUG_CATEGORY_SEGMENTS = {
  'asset-index': ['api', 'asset-group-index'],
  indexer: ['indexer'],
} satisfies Record<Exclude<AppDebugCategory, 'all'>, string[]>

export { APP_DEBUG_CATEGORY_VALUES, type AppDebugCategory } from './debug-categories'

export interface AppLoggerEnv {
  LOG_DEBUG_CATEGORIES?: AppDebugCategory[] | string
  LOG_JSON: boolean
}

function isAppDebugCategory(value: string): value is AppDebugCategory {
  return APP_DEBUG_CATEGORY_VALUES.includes(value as AppDebugCategory)
}

function normalizeDebugCategories(value: AppLoggerEnv['LOG_DEBUG_CATEGORIES']) {
  const categories =
    typeof value === 'string'
      ? value
          .split(',')
          .map((category) => category.trim())
          .filter(isAppDebugCategory)
      : (value ?? []).filter(isAppDebugCategory)

  return [...new Set(categories)].sort((left, right) => left.localeCompare(right))
}

export function configureAppLogger(options: { env: AppLoggerEnv }) {
  const debugCategories = normalizeDebugCategories(options.env.LOG_DEBUG_CATEGORIES)
  const debugAll = debugCategories.includes('all')
  const formatter = options.env.LOG_JSON ? jsonLinesFormatter : ansiColorFormatter

  configureSync({
    loggers: [
      {
        category: ['logtape'],
        lowestLevel: 'error',
        sinks: ['console'],
      },
      {
        category: DEFAULT_ROOT_CATEGORY,
        lowestLevel: debugAll ? 'debug' : 'info',
        sinks: ['console'],
      },
      ...(debugAll
        ? []
        : debugCategories
            .filter((category): category is Exclude<AppDebugCategory, 'all'> => category !== 'all')
            .map((category) => ({
              category: [...DEFAULT_ROOT_CATEGORY, ...DEFAULT_DEBUG_CATEGORY_SEGMENTS[category]],
              lowestLevel: 'debug' as const,
            }))),
    ],
    reset: true,
    sinks: {
      console: getConsoleSink({
        formatter,
      }),
    },
  })
}

export function getAppLogger(...segments: string[]) {
  return getLogger([...DEFAULT_ROOT_CATEGORY, ...segments])
}

export type Logger = ReturnType<typeof getAppLogger>

export function formatLogError(error: unknown) {
  if (error instanceof Error) {
    return error.stack ?? error.message
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error) ?? String(error)
    } catch {
      return String(error)
    }
  }

  return String(error)
}
