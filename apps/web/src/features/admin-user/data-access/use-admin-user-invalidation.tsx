import { useQueryClient } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'
import { getAdminUserAssetsQueryKey } from './use-admin-user-assets-query'
import { getAdminUserCommunitiesQueryKey } from './use-admin-user-communities-query'
import { getAdminUserGetQueryKey } from './use-admin-user-get-query'
import { getAdminUserIdentitiesQueryKey } from './use-admin-user-identities-query'

export function useAdminUserInvalidation() {
  const queryClient = useQueryClient()

  async function invalidateAssets(userId: string) {
    await queryClient.invalidateQueries({
      queryKey: getAdminUserAssetsQueryKey({
        userId,
      }),
    })
  }

  async function invalidateDirectory() {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminUser.list.key(),
    })
  }

  async function invalidateIdentities(userId: string) {
    await queryClient.invalidateQueries({
      queryKey: getAdminUserIdentitiesQueryKey(userId),
    })
  }

  async function invalidateUser(userId: string) {
    await queryClient.invalidateQueries({
      queryKey: getAdminUserGetQueryKey(userId),
    })
  }

  async function invalidateUserAndDirectory(userId: string) {
    await Promise.all([invalidateDirectory(), invalidateUser(userId)])
  }

  async function invalidateUserAssets(userId: string) {
    await Promise.all([invalidateAssets(userId), invalidateUser(userId)])
  }

  async function invalidateUserCommunities(userId: string) {
    await Promise.all([
      invalidateDirectory(),
      invalidateUser(userId),
      queryClient.invalidateQueries({
        queryKey: getAdminUserCommunitiesQueryKey(userId),
      }),
    ])
  }

  async function invalidateUserIdentities(userId: string) {
    await Promise.all([invalidateIdentities(userId), invalidateUser(userId)])
  }

  return {
    invalidateAssets,
    invalidateDirectory,
    invalidateIdentities,
    invalidateUser,
    invalidateUserAndDirectory,
    invalidateUserAssets,
    invalidateUserCommunities,
    invalidateUserIdentities,
  }
}
