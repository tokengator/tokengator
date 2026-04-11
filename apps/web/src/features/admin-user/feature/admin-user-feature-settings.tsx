import type { AdminUserDetailEntity } from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { useAdminUserGetQuery } from '../data-access/use-admin-user-get-query'
import { useAdminUserUpdate } from '../data-access/use-admin-user-update'
import { AdminUserSettingsUiForm, type AdminUserSettingsUiFormValues } from '../ui/admin-user-settings-ui-form'

function formatDateTimeLocalValue(value: Date | null) {
  if (!value) {
    return ''
  }

  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function AdminUserFeatureSettings({ initialUser }: { initialUser: AdminUserDetailEntity }) {
  const updateUser = useAdminUserUpdate(initialUser.id)
  const user = useAdminUserGetQuery(initialUser.id, {
    initialData: initialUser,
  })
  const currentUser = user.data ?? initialUser

  async function handleSaveUser(values: AdminUserSettingsUiFormValues) {
    try {
      const parsedBanExpires = values.banned && values.banExpires ? Date.parse(values.banExpires) : null
      const banExpires =
        typeof parsedBanExpires === 'number' && Number.isNaN(parsedBanExpires) ? null : parsedBanExpires

      await updateUser.mutateAsync({
        data: {
          banExpires,
          banned: values.banned,
          banReason: values.banned ? values.banReason || null : null,
          email: values.email,
          image: values.image || null,
          name: values.name,
          role: values.role,
          username: values.username || null,
        },
        userId: currentUser.id,
      })

      return true
    } catch {
      return false
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Edit the core account fields and moderation state.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminUserSettingsUiForm
          initialValues={{
            banExpires: formatDateTimeLocalValue(currentUser.banExpires),
            banned: currentUser.banned,
            banReason: currentUser.banReason ?? '',
            email: currentUser.email,
            image: currentUser.image ?? '',
            name: currentUser.name,
            role: currentUser.role === 'admin' ? 'admin' : 'user',
            username: currentUser.username ?? '',
          }}
          isPending={updateUser.isPending}
          onSubmit={handleSaveUser}
        />
      </CardContent>
    </Card>
  )
}
