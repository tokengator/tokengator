import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { organization } from '@tokengator/db/schema/auth'

import { adminOrganizationNormalizeLogo } from '../util/admin-organization-normalize-logo'

import type { AdminOrganizationUpdateInput } from './admin-organization-update-input'
import { adminOrganizationGet } from './admin-organization-get'
import { adminOrganizationRecordGet } from './admin-organization-record-get'

export async function adminOrganizationUpdate(input: AdminOrganizationUpdateInput) {
  const existingOrganization = await adminOrganizationRecordGet(input.organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  const [conflictingSlug] =
    input.data.slug === existingOrganization.slug
      ? [null]
      : await db
          .select({
            id: organization.id,
          })
          .from(organization)
          .where(eq(organization.slug, input.data.slug))
          .limit(1)

  if (conflictingSlug && conflictingSlug.id !== input.organizationId) {
    return {
      status: 'organization-slug-taken' as const,
    }
  }

  await db
    .update(organization)
    .set({
      logo: adminOrganizationNormalizeLogo(input.data.logo),
      name: input.data.name,
      slug: input.data.slug,
    })
    .where(eq(organization.id, input.organizationId))

  const organizationDetail = await adminOrganizationGet(input.organizationId)

  if (!organizationDetail) {
    return {
      status: 'organization-updated-but-not-loaded' as const,
    }
  }

  return {
    organization: organizationDetail,
    status: 'success' as const,
  }
}
