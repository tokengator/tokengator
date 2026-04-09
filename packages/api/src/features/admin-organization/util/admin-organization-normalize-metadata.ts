export function adminOrganizationNormalizeMetadata(metadata: string | null) {
  if (!metadata) {
    return null
  }

  try {
    return JSON.parse(metadata)
  } catch {
    return metadata
  }
}
