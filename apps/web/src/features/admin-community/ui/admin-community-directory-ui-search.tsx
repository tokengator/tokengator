import { Input } from '@tokengator/ui/components/input'

interface AdminCommunityDirectoryUiSearchProps {
  onChange: (value: string) => void
  value: string
}

export function AdminCommunityDirectoryUiSearch(props: AdminCommunityDirectoryUiSearchProps) {
  const { onChange, value } = props

  return (
    <div className="max-w-md">
      <Input onChange={(event) => onChange(event.target.value)} placeholder="Search by name or slug" value={value} />
    </div>
  )
}
