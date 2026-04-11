import { Loader2 } from 'lucide-react'
import { type SubmitEvent, useEffect, useRef, useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Input } from '@tokengator/ui/components/input'

export interface AdminUserSettingsUiFormValues {
  banExpires: string
  banReason: string
  banned: boolean
  email: string
  image: string
  name: string
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
    initialValues.email,
    initialValues.image,
    initialValues.name,
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
        <label className="text-sm" htmlFor="user-detail-name">
          Name
        </label>
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
        <label className="text-sm" htmlFor="user-detail-email">
          Email
        </label>
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
        <label className="text-sm" htmlFor="user-detail-username">
          Username
        </label>
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
        <label className="text-sm" htmlFor="user-detail-image">
          Image URL
        </label>
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
        <label className="text-sm" htmlFor="user-detail-role">
          Role
        </label>
        <select
          className="bg-background border px-2 py-1 text-sm"
          id="user-detail-role"
          onChange={(event) => {
            const nextRole = event.target.value

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
          {userRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={formValues.banned}
          onChange={(event) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              banned: event.target.checked,
            }))
          }
          type="checkbox"
        />
        Banned
      </label>
      <div className="grid gap-1.5">
        <label className="text-sm" htmlFor="user-detail-ban-reason">
          Ban Reason
        </label>
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
        <label className="text-sm" htmlFor="user-detail-ban-expires">
          Ban Expires
        </label>
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
