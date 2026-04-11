import { Input } from '@tokengator/ui/components/input'

export function AdminUserDirectoryUiSearch(props: { onChange: (value: string) => void; value: string }) {
  const { onChange, value } = props

  return (
    <div className="max-w-md">
      <label className="sr-only" htmlFor="admin-user-directory-search">
        Search users
      </label>
      <Input
        id="admin-user-directory-search"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name, username, or email"
        value={value}
      />
    </div>
  )
}
