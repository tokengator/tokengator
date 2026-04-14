import z from 'zod'

function normalizeCommunityCollectionAssetFacets(
  facets?: Record<string, string[]>,
): Record<string, string[]> | undefined {
  if (!facets) {
    return undefined
  }

  const normalizedValuesByGroupId = new Map<string, Set<string>>()

  for (const [groupId, values] of Object.entries(facets)) {
    const normalizedGroupId = groupId.trim().toLowerCase()

    if (!normalizedGroupId) {
      continue
    }

    const currentValues = normalizedValuesByGroupId.get(normalizedGroupId) ?? new Set<string>()

    for (const value of values) {
      const normalizedValue = value.trim().toLowerCase()

      if (normalizedValue) {
        currentValues.add(normalizedValue)
      }
    }

    if (currentValues.size > 0) {
      normalizedValuesByGroupId.set(normalizedGroupId, currentValues)
    }
  }

  const normalizedFacets = Object.fromEntries(
    [...normalizedValuesByGroupId.entries()]
      .sort(([leftGroupId], [rightGroupId]) => leftGroupId.localeCompare(rightGroupId))
      .map(([groupId, values]) => [groupId, [...values].sort()]),
  )

  return Object.keys(normalizedFacets).length > 0 ? normalizedFacets : undefined
}

export const communityListCollectionAssetsInputSchema = z.object({
  address: z.string().trim().min(1),
  facets: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .transform((value) => normalizeCommunityCollectionAssetFacets(value)),
  owner: z.string().trim().min(1).optional(),
  query: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1),
})
