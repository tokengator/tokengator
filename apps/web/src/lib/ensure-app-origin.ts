import { redirect } from '@tanstack/react-router'
import type { AppConfig } from '@tokengator/sdk'

import { getCurrentUrl } from './get-current-url'
import { getRedirectUrl } from './get-redirect-url'

export async function ensureAppOrigin({
  appConfig,
  location,
}: {
  appConfig: Pick<AppConfig, 'appOrigin'>
  location: { href: string; publicHref?: string }
}) {
  const currentUrl = await getCurrentUrl()

  if (currentUrl.origin === appConfig.appOrigin) {
    return
  }

  const routeHref = location.publicHref ?? location.href

  throw redirect({
    href: getRedirectUrl({
      appOrigin: appConfig.appOrigin,
      currentUrl,
      routeHref,
    }),
    replace: true,
    statusCode: 307,
  })
}
