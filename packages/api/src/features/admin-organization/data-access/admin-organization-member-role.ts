import z from 'zod'

export const adminOrganizationMemberRoleSchema = z.enum(['admin', 'member', 'owner'])

export type AdminOrganizationMemberRole = z.infer<typeof adminOrganizationMemberRoleSchema>
