import { HashConnect, HashConnectConnectionState, SessionData } from 'hashconnect'
import { LedgerId } from '@hashgraph/sdk'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'your-project-id-here'
const networkConfig = import.meta.env.VITE_HEDERA_NETWORK || 'mainnet'

if (projectId === 'your-project-id-here' || !projectId) {
  console.warn('WalletConnect Project ID is not configured.')
  console.warn('Get a Project ID from https://cloud.walletconnect.com and set VITE_WALLETCONNECT_PROJECT_ID.')
}

const getLedgerId = (): LedgerId => {
  switch (networkConfig.toLowerCase()) {
    case 'testnet':
      return LedgerId.TESTNET
    case 'previewnet':
      return LedgerId.PREVIEWNET
    case 'mainnet':
    default:
      return LedgerId.MAINNET
  }
}

const ledgerId = getLedgerId()
const networkName = networkConfig.charAt(0).toUpperCase() + networkConfig.slice(1).toLowerCase()

export const appMetadata = {
  name: 'Xylem agent',
  description: 'Xylem agent for Hedera DeFi workflows',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

export const createHashConnect = () => {
  console.log(`Creating HashConnect instance for Hedera ${networkName}`)
  console.log('Project ID:', projectId.slice(0, 8) + '...')
  console.log('Network:', networkConfig.toUpperCase())

  return new HashConnect(ledgerId, projectId, appMetadata, true)
}

export { projectId, networkConfig, networkName, ledgerId }
export type { HashConnectConnectionState, SessionData }
