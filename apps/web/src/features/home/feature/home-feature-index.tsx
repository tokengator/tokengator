import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@tokengator/ui/components/button'

import { HomeUiAccessFlow } from '../ui/home-ui-access-flow'
import { HomeUiCapabilityGrid } from '../ui/home-ui-capability-grid'
import { HomeUiHero } from '../ui/home-ui-hero'

const accessFlowSteps = [
  {
    description: 'Start with Discord or a Solana wallet that supports sign-in.',
    title: 'Connect identity',
  },
  {
    description: 'Token ownership and account links determine what you can access.',
    title: 'Verify membership',
  },
  {
    description: 'Review communities, roles, and gated operations in one dashboard.',
    title: 'Manage access',
  },
] as const

const capabilityItems = [
  {
    description: 'Keep membership and token-gated access aligned across your org.',
    label: 'Communities',
  },
  {
    description: 'Sync server roles from onchain ownership and verified identity.',
    label: 'Discord',
  },
  {
    description: 'Sign in with Solana and manage access without extra account sprawl.',
    label: 'Wallets',
  },
] as const

const homeFeatureShellOffsetStyle = {
  '--home-shell-offset': '4rem',
  marginTop: 'calc(var(--home-shell-offset) * -1)',
  minHeight: 'calc(100% + var(--home-shell-offset))',
} as CSSProperties & { '--home-shell-offset': string }

export function HomeFeatureIndex() {
  return (
    <div
      className="relative flex overflow-hidden px-4 pt-26 pb-10 sm:px-6 sm:pt-30 sm:pb-14"
      style={homeFeatureShellOffsetStyle}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_52%_at_50%_-8%,rgba(119,178,85,0.42),rgba(119,178,85,0.16)_32%,transparent_60%),radial-gradient(88%_48%_at_82%_100%,rgba(62,114,29,0.18),transparent_54%)]"
      />
      <section className="relative mx-auto flex w-full max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,28rem)] lg:items-end">
          <div className="space-y-7">
            <HomeUiHero
              action={
                <Button
                  className="h-11 px-6 text-sm sm:w-auto"
                  nativeButton={false}
                  render={<Link to="/login" />}
                  size="lg"
                >
                  Get started
                </Button>
              }
              actionText="Continue with Discord or a supported Solana wallet."
              description="Verify your identity, unlock access, and manage Discord roles and community operations from one place."
              eyebrow="Getting started"
              headline="Token-gated access for Solana communities."
            />
            <HomeUiCapabilityGrid items={capabilityItems} />
          </div>
          <HomeUiAccessFlow steps={accessFlowSteps} />
        </div>
      </section>
    </div>
  )
}
