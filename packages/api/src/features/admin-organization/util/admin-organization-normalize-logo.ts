export function adminOrganizationNormalizeLogo(logo?: string) {
  const trimmedLogo = logo?.trim()

  return trimmedLogo ? trimmedLogo : null
}
