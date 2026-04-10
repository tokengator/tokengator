import { describe, expect, test } from 'bun:test'

import { getRedirectUrl } from '../src/lib/get-redirect-url'

const cases = [
  {
    appOrigin: 'https://app.example.com:8443',
    currentUrl: new URL('http://localhost:3001/settings/profile?view=summary#details'),
    expected: 'https://app.example.com:8443/login/callback?invite=abc#verify',
    name: 'rewrites absolute routeHref and preserves query and hash',
    routeHref: 'http://localhost:3001/login/callback?invite=abc#verify',
  },
  {
    appOrigin: 'https://app.example.com:8443',
    currentUrl: new URL('http://localhost:3001/settings/profile?view=summary#details'),
    expected: 'https://app.example.com:8443/auth/callback',
    name: 'rewrites absolute routeHref without query or hash',
    routeHref: 'http://localhost:3001/auth/callback',
  },
  {
    appOrigin: 'https://app.example.com:8443',
    currentUrl: new URL('http://localhost:3001/community/123/members?tab=all#list'),
    expected: 'https://app.example.com:8443/community/123/moderators#top',
    name: 'rewrites relative routeHref and preserves hash without query',
    routeHref: './moderators#top',
  },
  {
    appOrigin: 'https://app.example.com:8443',
    currentUrl: new URL('http://localhost:3001/settings/profile?view=summary#details'),
    expected: 'https://app.example.com:8443/billing/invoices?filter=due',
    name: 'rewrites relative routeHref and preserves query without hash',
    routeHref: '../billing/invoices?filter=due',
  },
]

describe('getRedirectUrl', () => {
  for (const { appOrigin, currentUrl, expected, name, routeHref } of cases) {
    test(name, () => {
      expect(
        getRedirectUrl({
          appOrigin,
          currentUrl,
          routeHref,
        }),
      ).toBe(expected)
    })
  }
})
