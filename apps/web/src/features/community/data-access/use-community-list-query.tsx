import { queryOptions, useQuery } from '@tanstack/react-query'
import type { CommunityListResult } from '@tokengator/sdk'

import { orpc } from '@/lib/orpc'

import { getCommunityList } from './get-community-list-fn'

export function getCommunityListQueryKey() {
  return orpc.community.list.key()
}

export function getCommunityListQueryOptions() {
  return queryOptions({
    queryFn: () => orpc.community.list.call(),
    queryKey: getCommunityListQueryKey(),
  })
}

export function getCommunityListRouteQueryOptions() {
  return queryOptions({
    queryFn: () => getCommunityList(),
    queryKey: getCommunityListQueryKey(),
  })
}

export function useCommunityListQuery(options?: { initialData?: CommunityListResult }) {
  return useQuery({
    ...getCommunityListQueryOptions(),
    initialData: options?.initialData,
  })
}
