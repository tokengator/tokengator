export function adminOrganizationHasOwnerRole(role: string) {
  return role.split(',').includes('owner')
}
