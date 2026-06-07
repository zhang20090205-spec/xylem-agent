import { HashConnect, HashConnectConnectionState, SessionData } from 'hashconnect'
import { LedgerId } from '@hashgraph/sdk'

// Get project ID from WalletConnect Cloud
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'your-project-id-here'

// Get network configuration from environment
const networkConfig = import.meta.env.VITE_HEDERA_NETWORK || 'mainnet'

// Validate project ID
if (projectId === 'your-project-id-here' || !projectId) {
  console.warn('⚠️  WalletConnect Project ID not configured!')
  console.warn('Please get a Project ID from https://cloud.walletconnect.com')
  console.warn('and set VITE_WALLETCONNECT_PROJECT_ID in your .env file')
}

// Determine LedgerId based on environment variable
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

// App metadata for HashConnect
export const appMetadata = {
  name: 'Xylem agent',
  description: '集成 Hedera 钱包的 Xylem agent',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Create HashConnect instance with dynamic network configuration
export const createHashConnect = () => {
  console.log(`🚀 Creating HashConnect instance for Hedera ${networkName}`)
  console.log('📋 Project ID:', projectId.slice(0, 8) + '...')
  console.log('🌐 Network:', networkConfig.toUpperCase())

  return new HashConnect(
    ledgerId,  // Dynamic network based on environment variable
    projectId,
    appMetadata,
    true // Enable debug mode
  )
}

// Export configuration values
export { projectId, networkConfig, networkName, ledgerId }

// Export types for use in components
export type { HashConnectConnectionState, SessionData }
