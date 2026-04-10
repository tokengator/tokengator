export function getRedirectUrl({
  appOrigin,
  currentUrl,
  routeHref,
}: {
  appOrigin: string
  currentUrl: URL
  routeHref: string
}) {
  const appUrl = new URL(appOrigin)
  const redirectUrl = new URL(routeHref, currentUrl)

  redirectUrl.host = appUrl.host
  redirectUrl.protocol = appUrl.protocol

  return redirectUrl.toString()
}
