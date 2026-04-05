export const APP_DEBUG_CATEGORY_VALUES = ['all', 'asset-index', 'indexer'] as const

export type AppDebugCategory = (typeof APP_DEBUG_CATEGORY_VALUES)[number]
