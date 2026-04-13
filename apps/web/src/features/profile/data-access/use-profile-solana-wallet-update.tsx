import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { getProfileListIdentitiesQueryKey } from './use-profile-list-identities'
import { getProfileListSolanaWalletsQueryKey } from './use-profile-list-solana-wallets'

export function useProfileSolanaWalletUpdate(userId: string) {
  const queryClient = useQueryClient()
  const [updatingWalletCounts, setUpdatingWalletCounts] = useState<Record<string, number>>({})
  const mutation = useMutation(
    orpc.profile.updateSolanaWallet.mutationOptions({
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
        toast.success('Wallet name updated.')
      },
    }),
  )

  async function updateSolanaWallet(input: { id: string; name: string }) {
    setUpdatingWalletCounts((current) => ({
      ...current,
      [input.id]: (current[input.id] ?? 0) + 1,
    }))

    try {
      const result = await mutation.mutateAsync(input)

      return {
        didSucceed: true,
        name: result.solanaWallet.name,
      }
    } catch {
      return {
        didSucceed: false,
        name: null,
      }
    } finally {
      setUpdatingWalletCounts((current) => {
        const nextCount = (current[input.id] ?? 0) - 1

        if (nextCount > 0) {
          return {
            ...current,
            [input.id]: nextCount,
          }
        }

        const { [input.id]: _, ...rest } = current

        return rest
      })
    }
  }

  return {
    updateSolanaWallet,
    updatingWalletCounts,
  }
}
