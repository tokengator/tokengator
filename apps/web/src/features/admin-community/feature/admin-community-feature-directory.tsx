import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Button } from '@tokengator/ui/components/button'

import type { AppSession } from '@/features/auth/data-access/get-app-auth-state'

import { useAdminCommunityDirectoryQuery } from '../data-access/use-admin-community-directory-query'
import { AdminCommunityDirectoryUiList } from '../ui/admin-community-directory-ui-list'
import { AdminCommunityDirectoryUiSearch } from '../ui/admin-community-directory-ui-search'
import { AdminCommunityFeatureDirectoryCreate } from './admin-community-feature-directory-create'

interface AdminCommunityFeatureDirectoryProps {
  session: AppSession
}

export function AdminCommunityFeatureDirectory(props: AdminCommunityFeatureDirectoryProps) {
  const { session } = props
  const navigate = useNavigate()
  const [organizationSearch, setOrganizationSearch] = useState('')
  const deferredOrganizationSearch = useDeferredValue(organizationSearch)
  const normalizedOrganizationSearch = deferredOrganizationSearch.trim()
  const organizations = useAdminCommunityDirectoryQuery({
    search: normalizedOrganizationSearch || undefined,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-medium">Communities</h2>
          <p className="text-muted-foreground text-sm">Manage communities, ownership, and membership from one place.</p>
        </div>
        <AdminCommunityFeatureDirectoryCreate
          currentUser={session.user}
          onCreated={(organizationId) => {
            void navigate({
              params: {
                organizationId,
              },
              to: '/admin/communities/$organizationId',
            })
          }}
        />
      </div>

      <AdminCommunityDirectoryUiSearch onChange={setOrganizationSearch} value={organizationSearch} />

      {organizations.error ? (
        <div className="text-destructive text-sm">{organizations.error.message}</div>
      ) : organizations.isPending ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading communities
        </div>
      ) : (
        <AdminCommunityDirectoryUiList
          isSearchActive={Boolean(normalizedOrganizationSearch)}
          organizations={organizations.data?.organizations ?? []}
          renderManageAction={(organization) => (
            <Link
              params={{
                organizationId: organization.id,
              }}
              to="/admin/communities/$organizationId"
            >
              <Button variant="outline">Manage</Button>
            </Link>
          )}
          renderTitle={(organization) => (
            <Link
              className="hover:text-primary transition-colors"
              params={{
                organizationId: organization.id,
              }}
              to="/admin/communities/$organizationId"
            >
              {organization.name}
            </Link>
          )}
        />
      )}
    </div>
  )
}
