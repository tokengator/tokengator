import { eq } from 'drizzle-orm'
import { auth } from '@tokengator/auth'
import { db } from '@tokengator/db'
import { organization, user } from '@tokengator/db/schema/auth'

import { adminOrganizationNormalizeLogo } from '../util/admin-organization-normalize-logo'

import type { AdminOrganizationCreateInput } from './admin-organization-create-input'
import { adminOrganizationGet } from './admin-organization-get'

export async function adminOrganizationCreate(input: AdminOrganizationCreateInput) {
  const [existingOrganization] = await db
    .select({
      id: organization.id,
    })
    .from(organization)
    .where(eq(organization.slug, input.slug))
    .limit(1)

  if (existingOrganization) {
    return {
      status: 'organization-slug-taken' as const,
    }
  }

  const [existingOwner] = await db
    .select({
      id: user.id,
    })
    .from(user)
    .where(eq(user.id, input.ownerUserId))
    .limit(1)

  if (!existingOwner) {
    return {
      status: 'owner-user-not-found' as const,
    }
  }

  const createdOrganization = await auth.api.createOrganization({
    body: {
      logo: adminOrganizationNormalizeLogo(input.logo) ?? undefined,
      name: input.name,
      slug: input.slug,
      userId: input.ownerUserId,
    },
  })
  const organizationDetail = await adminOrganizationGet(createdOrganization.id)

  if (!organizationDetail) {
    return {
      status: 'organization-created-but-not-loaded' as const,
    }
  }

  return {
    organization: organizationDetail,
    status: 'success' as const,
  }
}
