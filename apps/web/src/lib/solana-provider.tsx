import type { ReactNode } from 'react'
import {
  createSolanaDevnet,
  createSolanaLocalnet,
  createSolanaMainnet,
  createSolanaTestnet,
  createWalletUiConfig,
  WalletUi,
} from '@wallet-ui/react'

interface SolanaProviderProps {
  appConfig: {
    solanaCluster: 'devnet' | 'localnet' | 'mainnet' | 'testnet'
    solanaEndpoint: string
  }
  children: ReactNode
}

const walletUiConfigByKey = new Map<string, ReturnType<typeof createWalletUiConfig>>()

function createSolanaCluster({
  solanaCluster,
  solanaEndpoint,
}: {
  solanaCluster: SolanaProviderProps['appConfig']['solanaCluster']
  solanaEndpoint: string
}) {
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

export function SolanaProvider({ appConfig, children }: SolanaProviderProps) {
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
