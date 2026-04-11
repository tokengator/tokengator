import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminUserInvalidation } from './use-admin-user-invalidation'

export function useAdminUserSolanaWalletUpdate(userId: string) {
  const adminUser = useAdminUserInvalidation()
  const [updatingWalletCounts, setUpdatingWalletCounts] = useState<Record<string, number>>({})
  const mutation = useMutation(
    orpc.adminUser.updateSolanaWallet.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await adminUser.invalidateUserIdentities(userId)
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
      const result = await mutation.mutateAsync({
        name: input.name,
        solanaWalletId: input.id,
        userId,
      })

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
