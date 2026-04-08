import type { ReactNode } from 'react'

import { ShellUiFrame } from '../ui/shell-ui-frame'

import { ShellFeatureHeader } from './shell-feature-header'

export function ShellFeatureFrame({ children }: { children: ReactNode }) {
  return <ShellUiFrame header={<ShellFeatureHeader />}>{children}</ShellUiFrame>
}
