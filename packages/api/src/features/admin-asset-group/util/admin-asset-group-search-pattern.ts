export function adminAssetGroupSearchPattern(search?: string) {
  if (!search) {
    return undefined
  }

  return `%${search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}
