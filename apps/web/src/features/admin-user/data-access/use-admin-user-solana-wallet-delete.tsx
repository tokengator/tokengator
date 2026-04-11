import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminUserInvalidation } from './use-admin-user-invalidation'

export function useAdminUserSolanaWalletDelete(userId: string) {
  const adminUser = useAdminUserInvalidation()
  const [deletingWalletCounts, setDeletingWalletCounts] = useState<Record<string, number>>({})
  const mutation = useMutation(
    orpc.adminUser.deleteSolanaWallet.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await Promise.all([
          adminUser.invalidateUserAndDirectory(userId),
          adminUser.invalidateAssets(userId),
          adminUser.invalidateIdentities(userId),
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
        solanaWalletId: id,
        userId,
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
