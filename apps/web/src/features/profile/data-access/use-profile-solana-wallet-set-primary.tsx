import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { getProfileListIdentitiesQueryKey } from './use-profile-list-identities'
import { getProfileListSolanaWalletsQueryKey } from './use-profile-list-solana-wallets'

export function useProfileSolanaWalletSetPrimary(userId: string) {
  const queryClient = useQueryClient()
  const [settingPrimaryWalletCounts, setSettingPrimaryWalletCounts] = useState<Record<string, number>>({})
  const mutation = useMutation(
    orpc.profile.setPrimarySolanaWallet.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getProfileListIdentitiesQueryKey(userId),
          }),
          queryClient.invalidateQueries({
            queryKey: getProfileListSolanaWalletsQueryKey(userId),
          }),
        ])
        toast.success('Primary wallet updated.')
      },
    }),
  )

  async function setPrimarySolanaWallet(id: string) {
    setSettingPrimaryWalletCounts((current) => ({
      ...current,
      [id]: (current[id] ?? 0) + 1,
    }))

    try {
      await mutation.mutateAsync({
        id,
      })

      return true
    } catch {
      return false
    } finally {
      setSettingPrimaryWalletCounts((current) => {
        const nextCount = (current[id] ?? 0) - 1

        if (nextCount > 0) {
          return {
            ...current,
            [id]: nextCount,
          }
        }

        const { [id]: _, ...rest } = current

        return rest
      })
    }
  }

  return {
    setPrimarySolanaWallet,
    settingPrimaryWalletCounts,
  }
}
