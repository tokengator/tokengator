import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { organization } from '@tokengator/db/schema/auth'

import { adminOrganizationNormalizeLogo } from '../util/admin-organization-normalize-logo'

import { adminOrganizationGet } from './admin-organization-get'
import { adminOrganizationRecordGet } from './admin-organization-record-get'
import type { AdminOrganizationUpdateInput } from './admin-organization-update-input'

function normalizeOptionalText(value?: string) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : null
}

function serializeMetadata(metadata: unknown): string | null | undefined {
  if (metadata === undefined) {
    return undefined
  }

  if (metadata === null) {
    return null
  }

  if (typeof metadata === 'string') {
    return metadata
  }

  return JSON.stringify(metadata)
}

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
      description: normalizeOptionalText(input.data.description),
      discordUrl: normalizeOptionalText(input.data.discordUrl),
      githubUrl: normalizeOptionalText(input.data.githubUrl),
      logo: adminOrganizationNormalizeLogo(input.data.logo),
      metadata: serializeMetadata(input.data.metadata),
      name: input.data.name,
      slug: input.data.slug,
      telegramUrl: normalizeOptionalText(input.data.telegramUrl),
      websiteUrl: normalizeOptionalText(input.data.websiteUrl),
      xUrl: normalizeOptionalText(input.data.xUrl),
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
