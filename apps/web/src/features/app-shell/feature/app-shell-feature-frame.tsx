import type { ReactNode } from 'react'

import { AppShellUiFrame } from '../ui/app-shell-ui-frame'

import { AppShellFeatureHeader } from './app-shell-feature-header'

export function AppShellFeatureFrame({ children }: { children: ReactNode }) {
  return <AppShellUiFrame header={<AppShellFeatureHeader />}>{children}</AppShellUiFrame>
}
