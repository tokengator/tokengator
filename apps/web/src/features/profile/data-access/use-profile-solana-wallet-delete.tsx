import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { getProfileListIdentitiesQueryKey } from './use-profile-list-identities'
import { getProfileListSolanaWalletsQueryKey } from './use-profile-list-solana-wallets'

export function useProfileSolanaWalletDelete(userId: string) {
  const queryClient = useQueryClient()
  const [deletingWalletCounts, setDeletingWalletCounts] = useState<Record<string, number>>({})
  const mutation = useMutation(
    orpc.profile.deleteSolanaWallet.mutationOptions({
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
        toast.success('Wallet deleted.')
      },
    }),
  )

  async function deleteSolanaWallet(id: string) {
    setDeletingWalletCounts((current) => ({
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
      setDeletingWalletCounts((current) => {
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
    deleteSolanaWallet,
    deletingWalletCounts,
  }
}
