export function adminAssetSearchTerm(search?: string) {
  const normalizedSearch = search?.trim()

  if (!normalizedSearch) {
    return undefined
  }

  return normalizedSearch
}
