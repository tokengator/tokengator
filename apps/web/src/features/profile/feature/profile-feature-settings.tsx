import type { ProfileSettingsUpdateInput } from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Label } from '@tokengator/ui/components/label'
import { Switch } from '@tokengator/ui/components/switch'

import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'
import { useAppSession } from '@/features/auth/data-access/use-app-session'

import { useProfileSettings } from '../data-access/use-profile-get-settings'
import { useProfileUpdateSettings } from '../data-access/use-profile-update-settings'

export function ProfileFeatureSettings() {
  const { data: appAuthState } = useAppAuthStateQuery()
  const { data: session } = useAppSession()
  const userId = session?.user.id ?? ''
  const settings = useProfileSettings(userId)
  const updateSettings = useProfileUpdateSettings(userId)
  const persistedSettings = settings.data?.settings ?? appAuthState?.profileSettings?.settings ?? null
  const developerMode = updateSettings.pendingSettings?.developerMode ?? persistedSettings?.developerMode ?? false
  const isPrivate = updateSettings.pendingSettings?.private ?? persistedSettings?.private ?? false
  const isDisabled = updateSettings.isPending || (persistedSettings === null && settings.isPending)

  if (!session) {
    return null
  }

  async function updateProfileSettings(input: ProfileSettingsUpdateInput) {
    await updateSettings.updateSettings(input).catch(() => {
      // Error handling already lives in the mutation onError callback.
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Manage your profile preferences.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <Label htmlFor="profile-settings-developer-mode">Developer mode</Label>
            <p className="text-muted-foreground text-sm">Show developer tools like debug views across the app.</p>
          </div>
          <Switch
            checked={developerMode}
            disabled={isDisabled}
            id="profile-settings-developer-mode"
            onCheckedChange={(checked) =>
              void updateProfileSettings({
                developerMode: checked,
                private: isPrivate,
              })
            }
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <Label htmlFor="profile-settings-private">Private profile</Label>
            <p className="text-muted-foreground text-sm">
              Hide your identities and communities from other signed-in users.
            </p>
          </div>
          <Switch
            checked={isPrivate}
            disabled={isDisabled}
            id="profile-settings-private"
            onCheckedChange={(checked) =>
              void updateProfileSettings({
                developerMode,
                private: checked,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
