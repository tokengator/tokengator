import { useDeferredValue, useState } from 'react'
import type { AdminOrganizationCreateInput, AdminOrganizationOwnerCandidateEntity } from '@tokengator/sdk'
import { slugify } from '@tokengator/ui/util/slugify'

import type { AppSessionUser } from '@/features/auth/data-access/get-app-auth-state'

import { useAdminCommunityDirectoryCreate } from '../data-access/use-admin-community-directory-create'
import { useAdminCommunityOwnerCandidatesQuery } from '../data-access/use-admin-community-owner-candidates-query'
import { AdminCommunityDirectoryUiCreateDialog } from '../ui/admin-community-directory-ui-create-dialog'

const defaultCreateValues = {
  logo: '',
  name: '',
  slug: '',
} satisfies Pick<AdminOrganizationCreateInput, 'logo' | 'name' | 'slug'>

interface AdminCommunityFeatureDirectoryCreateProps {
  currentUser: AppSessionUser
  onCreated: (organizationId: string) => void
}

export function AdminCommunityFeatureDirectoryCreate(props: AdminCommunityFeatureDirectoryCreateProps) {
  const { currentUser, onCreated } = props
  const currentOwner = {
    id: currentUser.id,
    name: currentUser.name,
    username: currentUser.username ?? null,
  } satisfies AdminOrganizationOwnerCandidateEntity
  const createCommunity = useAdminCommunityDirectoryCreate()
  const [createValues, setCreateValues] = useState(defaultCreateValues)
  const [isOpen, setIsOpen] = useState(false)
  const [ownerSearch, setOwnerSearch] = useState('')
  const [selectedOwner, setSelectedOwner] = useState<AdminOrganizationOwnerCandidateEntity>(currentOwner)
  const deferredOwnerSearch = useDeferredValue(ownerSearch)
  const normalizedOwnerSearch = deferredOwnerSearch.trim()
  const ownerCandidates = useAdminCommunityOwnerCandidatesQuery({
    enabled: isOpen,
    search: normalizedOwnerSearch || undefined,
  })

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen)
    setOwnerSearch('')
    setSelectedOwner(currentOwner)
  }

  function handleNameBlur() {
    setCreateValues((currentValues) => {
      if (currentValues.slug.trim()) {
        return currentValues
      }

      return {
        ...currentValues,
        slug: slugify(currentValues.name),
      }
    })
  }

  async function handleSubmit() {
    try {
      const organization = await createCommunity.mutateAsync({
        logo: createValues.logo || undefined,
        name: createValues.name,
        ownerUserId: selectedOwner.id,
        slug: createValues.slug,
      })

      setCreateValues(defaultCreateValues)
      setIsOpen(false)
      setOwnerSearch('')
      setSelectedOwner(currentOwner)
      onCreated(organization.id)
    } catch {
      // The mutation hook already reports the failure toast.
    }
  }

  return (
    <AdminCommunityDirectoryUiCreateDialog
      createValues={createValues}
      isOpen={isOpen}
      isOwnerCandidatesPending={ownerCandidates.isPending}
      isPending={createCommunity.isPending}
      onLogoChange={(logo) =>
        setCreateValues((currentValues) => ({
          ...currentValues,
          logo,
        }))
      }
      onNameBlur={handleNameBlur}
      onNameChange={(name) =>
        setCreateValues((currentValues) => ({
          ...currentValues,
          name,
        }))
      }
      onOpenChange={handleOpenChange}
      onOwnerSearchChange={setOwnerSearch}
      onOwnerSelect={setSelectedOwner}
      onSlugChange={(slug) =>
        setCreateValues((currentValues) => ({
          ...currentValues,
          slug,
        }))
      }
      onSubmit={() => {
        void handleSubmit()
      }}
      ownerCandidates={ownerCandidates.data ?? []}
      ownerSearch={ownerSearch}
      selectedOwner={selectedOwner}
    />
  )
}
