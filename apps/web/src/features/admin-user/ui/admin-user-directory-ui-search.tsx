import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'

export function AdminUserDirectoryUiSearch(props: { onChange: (value: string) => void; value: string }) {
  const { onChange, value } = props

  return (
    <div className="max-w-md">
      <Label className="sr-only" htmlFor="admin-user-directory-search">
        Search users
      </Label>
      <Input
        id="admin-user-directory-search"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name, username, or email"
        value={value}
      />
    </div>
  )
}
