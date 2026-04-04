export function matchesAdminCommunityListRunsQueryForOrganization(
  queryKey: readonly unknown[],
  organizationId: string,
) {
  const [procedurePath, queryOptions] = queryKey

  if (!Array.isArray(procedurePath)) {
    return false
  }

  if (procedurePath[0] !== 'adminCommunityRole' || procedurePath[1] !== 'listRuns') {
    return false
  }

  if (!queryOptions || typeof queryOptions !== 'object') {
    return false
  }

  const inputCandidate = 'input' in queryOptions ? queryOptions.input : null

  if (!inputCandidate || typeof inputCandidate !== 'object') {
    return false
  }

  const input = inputCandidate as { organizationId?: unknown }

  return input?.organizationId === organizationId
}
