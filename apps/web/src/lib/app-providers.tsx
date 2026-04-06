import type { ReactNode } from 'react'

import { ThemeProvider } from '@/lib/theme-provider'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return <ThemeProvider>{children}</ThemeProvider>
}
