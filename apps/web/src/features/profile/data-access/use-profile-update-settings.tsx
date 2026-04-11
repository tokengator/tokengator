import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ProfileSettingsEntity, ProfileSettingsUpdateInput } from '@tokengator/sdk'

import { refreshAppAuthState } from '@/features/auth/data-access/get-app-auth-state'
import { orpc } from '@/lib/orpc'

import { getProfileSettingsQueryKey } from './use-profile-get-settings'

export function useProfileUpdateSettings(userId: string) {
  const queryClient = useQueryClient()
  const [pendingSettings, setPendingSettings] = useState<ProfileSettingsEntity | null>(null)
  const mutation = useMutation(
    orpc.profile.updateSettings.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (result) => {
        queryClient.setQueryData(getProfileSettingsQueryKey(userId), result)
        await refreshAppAuthState(queryClient)
        toast.success('Settings updated.')
      },
    }),
  )

  async function updateSettings(input: ProfileSettingsUpdateInput) {
    setPendingSettings({
      developerMode: input.developerMode,
    })

    try {
      await mutation.mutateAsync(input)
    } finally {
      setPendingSettings(null)
    }
  }

  return {
    isPending: mutation.isPending,
    pendingSettings,
    updateSettings,
  }
}
