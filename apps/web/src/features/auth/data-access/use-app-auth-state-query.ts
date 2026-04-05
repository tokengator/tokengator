import { useQuery } from '@tanstack/react-query'

import { Route as RootRoute } from '@/routes/__root'

import { getAppAuthStateQueryOptions } from './get-app-auth-state'

export function useAppAuthStateQuery() {
  const { appAuthState } = RootRoute.useRouteContext()

  return useQuery({
    ...getAppAuthStateQueryOptions(),
    initialData: appAuthState,
  })
}
