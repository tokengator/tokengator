import type { ReactNode } from 'react'
import {
  createSolanaDevnet,
  createSolanaLocalnet,
  createSolanaMainnet,
  createSolanaTestnet,
  createWalletUiConfig,
  WalletUi,
} from '@wallet-ui/react'
import type { AppConfig } from '@tokengator/sdk'

import { Route as RootRoute } from '@/routes/__root'

interface SolanaProviderProps {
  children: ReactNode
}

const walletUiConfigByKey = new Map<string, ReturnType<typeof createWalletUiConfig>>()

function createSolanaCluster({ solanaCluster, solanaEndpoint }: Pick<AppConfig, 'solanaCluster' | 'solanaEndpoint'>) {
  switch (solanaCluster) {
    case 'devnet':
      return createSolanaDevnet(solanaEndpoint)
    case 'localnet':
      return createSolanaLocalnet(solanaEndpoint)
    case 'mainnet':
      return createSolanaMainnet(solanaEndpoint)
    case 'testnet':
      return createSolanaTestnet(solanaEndpoint)
  }
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  const { appConfig } = RootRoute.useRouteContext()
  const configKey = `${appConfig.solanaCluster}:${appConfig.solanaEndpoint}`
  const config =
    walletUiConfigByKey.get(configKey) ??
    createWalletUiConfig({
      clusters: [
        createSolanaCluster({
          solanaCluster: appConfig.solanaCluster,
          solanaEndpoint: appConfig.solanaEndpoint,
        }),
      ],
    })

  walletUiConfigByKey.set(configKey, config)

  return <WalletUi config={config}>{children}</WalletUi>
}
