import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { orpc } from '@/lib/orpc'
import { useAdminUserInvalidation } from './use-admin-user-invalidation'

export function useAdminUserSolanaWalletSetPrimary(userId: string) {
  const adminUser = useAdminUserInvalidation()
  const [settingPrimaryWalletCounts, setSettingPrimaryWalletCounts] = useState<Record<string, number>>({})
  const mutation = useMutation(
    orpc.adminUser.setPrimarySolanaWallet.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await adminUser.invalidateUserIdentities(userId)
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
        solanaWalletId: id,
        userId,
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
