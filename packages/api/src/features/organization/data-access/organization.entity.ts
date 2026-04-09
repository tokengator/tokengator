export type OrganizationMembershipGatedRoleEntity = {
  id: string
  name: string
  slug: string
}

export type OrganizationMembershipEntity = {
  gatedRoles: OrganizationMembershipGatedRoleEntity[]
  id: string
  logo: string | null
  name: string
  role: string
  slug: string
}

export type OrganizationListMineResult = {
  organizations: OrganizationMembershipEntity[]
}
