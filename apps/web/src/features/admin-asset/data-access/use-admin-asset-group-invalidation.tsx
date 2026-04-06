import { useQueryClient } from '@tanstack/react-query'

import { orpc } from '@/utils/orpc'
import { useAdminAssetInvalidation } from './use-admin-asset-invalidation'

export function useAdminAssetGroupInvalidation() {
  const asset = useAdminAssetInvalidation()
  const queryClient = useQueryClient()

  async function invalidateGroup(assetGroupId: string) {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminAssetGroup.get.key({
        input: {
          assetGroupId,
        },
      }),
    })
  }

  async function invalidateGroupAndList(assetGroupId: string) {
    await Promise.all([invalidateGroup(assetGroupId), invalidateGroupList()])
  }

  async function invalidateGroupIndex(assetGroupId: string) {
    await Promise.all([
      asset.invalidateAssetList(),
      invalidateGroup(assetGroupId),
      invalidateGroupList(),
      invalidateIndexRuns(assetGroupId),
    ])
  }

  async function invalidateGroupList() {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminAssetGroup.list.key(),
    })
  }

  async function invalidateIndexRuns(assetGroupId: string) {
    await queryClient.invalidateQueries({
      queryKey: orpc.adminAssetGroup.listIndexRuns.key({
        input: {
          assetGroupId,
        },
      }),
    })
  }

  return {
    invalidateGroup,
    invalidateGroupAndList,
    invalidateGroupIndex,
    invalidateGroupList,
  }
}
