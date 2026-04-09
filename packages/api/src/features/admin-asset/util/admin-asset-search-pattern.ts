export function adminAssetSearchPattern(search?: string) {
  if (!search) {
    return undefined
  }

  return `%${search.toLowerCase().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}
