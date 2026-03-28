import type { OrganizationListMineData } from '../data-access/get-organization-list-mine'

import { useOrganizationListMine } from '../data-access/use-organization-list-mine'
import { useOrganizationSelectOptions } from '../data-access/use-organization-select-options'
import { useOrganizationSetActive } from '../data-access/use-organization-set-active'
import { OrganizationUiSelect } from '../ui/organization-ui-select'

interface OrganizationFeatureSelectActiveProps {
  initialData?: OrganizationListMineData | null
  onSuccess?: (organizationId: string) => void
}

export function OrganizationFeatureSelectActive({ initialData, onSuccess }: OrganizationFeatureSelectActiveProps) {
  const organizations = useOrganizationListMine({
    initialData: initialData ?? undefined,
  })
  const setActiveOrganization = useOrganizationSetActive({
    onSuccess,
  })
  const options = useOrganizationSelectOptions(organizations.data?.organizations)

  const activeOrganizationId = organizations.data?.activeOrganizationId ?? ''

  const placeholder = organizations.isPending
    ? 'Loading communities...'
    : organizations.isError
      ? 'Communities unavailable'
      : options.length === 0
        ? 'No communities'
        : 'Select community'

  return (
    <div className="shrink-0">
      <OrganizationUiSelect
        ariaLabel="Active community"
        disabled={
          organizations.isPending || organizations.isError || options.length === 0 || setActiveOrganization.isPending
        }
        onValueChange={(organizationId) => {
          if (!organizationId || organizationId === activeOrganizationId) {
            return
          }

          setActiveOrganization.mutate({
            organizationId,
          })
        }}
        options={options}
        placeholder={placeholder}
        value={activeOrganizationId}
      />
    </div>
  )
}
