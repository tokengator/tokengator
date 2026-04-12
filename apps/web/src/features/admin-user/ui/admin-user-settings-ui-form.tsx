import { Loader2 } from 'lucide-react'
import { type SubmitEvent, useEffect, useRef, useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Checkbox } from '@tokengator/ui/components/checkbox'
import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tokengator/ui/components/select'

export interface AdminUserSettingsUiFormValues {
  banExpires: string
  banReason: string
  banned: boolean
  developerMode: boolean
  email: string
  image: string
  name: string
  private: boolean
  role: 'admin' | 'user'
  username: string
}

const userRoles = ['admin', 'user'] as const satisfies readonly AdminUserSettingsUiFormValues['role'][]

function isAdminUserRole(value: string): value is AdminUserSettingsUiFormValues['role'] {
  return userRoles.includes(value as AdminUserSettingsUiFormValues['role'])
}

export function AdminUserSettingsUiForm(props: {
  initialValues: AdminUserSettingsUiFormValues
  isPending: boolean
  onSubmit: (values: AdminUserSettingsUiFormValues) => Promise<boolean>
}) {
  const { initialValues, isPending, onSubmit } = props
  const [formValues, setFormValues] = useState(initialValues)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    setFormValues(initialValues)
  }, [
    initialValues.banExpires,
    initialValues.banReason,
    initialValues.banned,
    initialValues.developerMode,
    initialValues.email,
    initialValues.image,
    initialValues.name,
    initialValues.private,
    initialValues.role,
    initialValues.username,
  ])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isPending || isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true

    try {
      await onSubmit(formValues)
    } finally {
      isSubmittingRef.current = false
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-1.5">
        <Label htmlFor="user-detail-name">Name</Label>
        <Input
          id="user-detail-name"
          onChange={(event) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              name: event.target.value,
            }))
          }
          required
          value={formValues.name}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="user-detail-email">Email</Label>
        <Input
          id="user-detail-email"
          onChange={(event) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              email: event.target.value,
            }))
          }
          required
          type="email"
          value={formValues.email}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="user-detail-username">Username</Label>
        <Input
          id="user-detail-username"
          onChange={(event) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              username: event.target.value,
            }))
          }
          value={formValues.username}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="user-detail-image">Avatar URL</Label>
        <Input
          id="user-detail-image"
          onChange={(event) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              image: event.target.value,
            }))
          }
          value={formValues.image}
        />
      </div>
      <div className="grid gap-1.5">
        <Label id="user-detail-role-label">Role</Label>
        <Select
          disabled={isPending}
          onValueChange={(value) => {
            if (value === null) {
              return
            }

            const nextRole = value

            if (!isAdminUserRole(nextRole)) {
              return
            }

            setFormValues((currentValues) => ({
              ...currentValues,
              role: nextRole,
            }))
          }}
          value={formValues.role}
        >
          <SelectTrigger aria-labelledby="user-detail-role-label" className="w-full" id="user-detail-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {userRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={formValues.banned}
          id="user-detail-banned"
          onCheckedChange={(checked) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              banned: Boolean(checked),
            }))
          }
        />
        <Label htmlFor="user-detail-banned">Banned</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={formValues.developerMode}
          id="user-detail-developer-mode"
          onCheckedChange={(checked) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              developerMode: Boolean(checked),
            }))
          }
        />
        <Label htmlFor="user-detail-developer-mode">Developer Mode</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={formValues.private}
          id="user-detail-private"
          onCheckedChange={(checked) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              private: Boolean(checked),
            }))
          }
        />
        <Label htmlFor="user-detail-private">Private</Label>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="user-detail-ban-reason">Ban Reason</Label>
        <Input
          disabled={!formValues.banned}
          id="user-detail-ban-reason"
          onChange={(event) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              banReason: event.target.value,
            }))
          }
          value={formValues.banReason}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="user-detail-ban-expires">Ban Expires</Label>
        <Input
          disabled={!formValues.banned}
          id="user-detail-ban-expires"
          onChange={(event) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              banExpires: event.target.value,
            }))
          }
          type="datetime-local"
          value={formValues.banExpires}
        />
      </div>
      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  )
}
