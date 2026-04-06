import type { ReactNode } from 'react'

import { SolanaProvider } from '@/lib/solana-provider'
import { ThemeProvider } from '@/lib/theme-provider'

interface AppProvidersProps {
  appConfig: {
    solanaCluster: 'devnet' | 'localnet' | 'mainnet' | 'testnet'
    solanaEndpoint: string
  }
  children: ReactNode
}

export function AppProviders({ appConfig, children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <SolanaProvider appConfig={appConfig}>{children}</SolanaProvider>
    </ThemeProvider>
  )
}
