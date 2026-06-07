import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { HashConnect, HashConnectConnectionState, SessionData } from 'hashconnect'
import { createHashConnect } from '../config/hashconnect'

// Global singleton to prevent multiple HashConnect instances across hot reloads
let globalHashConnectInstance: HashConnect | null = null
let globalInitPromise: Promise<HashConnect> | null = null

export function useWallet() {
  const [hashconnect, setHashconnect] = useState<HashConnect | null>(null)
  const [connectionState, setConnectionState] = useState<HashConnectConnectionState>(HashConnectConnectionState.Disconnected)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Stable refs that persist across re-renders
  const modalOpenedRef = useRef(false)
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupFunctionsRef = useRef<(() => void)[]>([])
  
  // Helper function to clear all WalletConnect storage
  const clearWalletConnectStorage = useCallback(() => {
    try {
      const storageKeys = [
        'wc@2:client:0.3//session',
        'wc@2:core:0.3//keychain', 
        'wc@2:core:0.3//messages',
        'wc@2:core:0.3//expirer',
        'wc@2:core:0.3//pairing',
        'wc@2:universal_provider://namespaces'
      ]
      storageKeys.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          // Ignore errors for individual keys
        }
      })
      console.log('🧹 Cleared all WalletConnect storage')
    } catch (e) {
      console.warn('Could not clear WalletConnect storage:', e)
    }
  }, [])

  // Get or create HashConnect instance (singleton pattern)
  const getHashConnectInstance = useCallback(async (): Promise<HashConnect> => {
    // Return existing instance if available
    if (globalHashConnectInstance) {
      console.log('♻️ Reusing existing HashConnect instance')
      return globalHashConnectInstance
    }

    // Return existing init promise if in progress
    if (globalInitPromise) {
      console.log('⏳ Waiting for existing HashConnect initialization')
      return globalInitPromise
    }

    console.log('🚀 Creating new HashConnect instance')
    
    // Clear storage before creating new instance
    clearWalletConnectStorage()

    // Create initialization promise
    globalInitPromise = (async () => {
      try {
        const hc = createHashConnect()
        await hc.init()
        globalHashConnectInstance = hc
        console.log('✅ HashConnect instance created and initialized')
        return hc
      } catch (error) {
        console.error('❌ Failed to initialize HashConnect:', error)
        globalInitPromise = null // Reset so it can be retried
        throw error
      }
    })()

    return globalInitPromise
  }, [clearWalletConnectStorage])

  // Initialize HashConnect only once per component instance
  useEffect(() => {
    let isMounted = true

    const initializeHashConnect = async () => {
      try {
        const hc = await getHashConnectInstance()
        
        if (!isMounted) return // Component unmounted during init
        
        setHashconnect(hc)
        setError(null)

        // Set up event listeners with cleanup
        const onPairing = (newPairing: SessionData) => {
          if (!isMounted) return
          console.log('✅ Paired with wallet:', newPairing)
          setSessionData(newPairing)
          setError(null)
          modalOpenedRef.current = false
          
          // Clear timeout since connection succeeded
          if (modalTimeoutRef.current) {
            clearTimeout(modalTimeoutRef.current)
            modalTimeoutRef.current = null
          }
          
          if (newPairing.accountIds && newPairing.accountIds.length > 0) {
            setAddress(newPairing.accountIds[0])
          }
        }

        const onDisconnection = () => {
          if (!isMounted) return
          console.log('❌ Disconnected from wallet')
          setSessionData(null)
          setAddress(null)
          setBalance(null)
          setError(null)
          modalOpenedRef.current = false
          
          if (modalTimeoutRef.current) {
            clearTimeout(modalTimeoutRef.current)
            modalTimeoutRef.current = null
          }
        }

        const onConnectionStatusChange = (connectionStatus: HashConnectConnectionState) => {
          if (!isMounted) return
          console.log('🔄 Connection status changed:', connectionStatus)
          setConnectionState(connectionStatus)
          setIsConnecting(connectionStatus === HashConnectConnectionState.Connecting)
          
          if (connectionStatus === HashConnectConnectionState.Disconnected) {
            modalOpenedRef.current = false
            if (modalTimeoutRef.current) {
              clearTimeout(modalTimeoutRef.current)
              modalTimeoutRef.current = null
            }
          }
        }

        // Register event listeners
        hc.pairingEvent.on(onPairing)
        hc.disconnectionEvent.on(onDisconnection)
        hc.connectionStatusChangeEvent.on(onConnectionStatusChange)

        // Store cleanup functions
        cleanupFunctionsRef.current = [
          () => hc.pairingEvent.off(onPairing),
          () => hc.disconnectionEvent.off(onDisconnection),
          () => hc.connectionStatusChangeEvent.off(onConnectionStatusChange)
        ]

      } catch (error) {
        if (!isMounted) return
        console.error('❌ Failed to initialize HashConnect:', error)
        setError(error instanceof Error ? error.message : 'Failed to initialize wallet connection')
      }
    }

    initializeHashConnect()

    return () => {
      isMounted = false
      
      // Clear timeout
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current)
        modalTimeoutRef.current = null
      }
      
      // Run cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup()
        } catch (e) {
          console.warn('Error during event cleanup:', e)
        }
      })
      cleanupFunctionsRef.current = []
      
      // Reset local state
      setHashconnect(null)
      setConnectionState(HashConnectConnectionState.Disconnected)
      setSessionData(null)
      setAddress(null)
      setBalance(null)
      setIsConnecting(false)
      modalOpenedRef.current = false
      
      console.log('✅ useWallet cleanup completed')
    }
  }, [getHashConnectInstance])

  // Get balance when address changes
  useEffect(() => {
    if (address && connectionState === HashConnectConnectionState.Paired) {
      // For now, we'll show a mock balance
      // In a real implementation, you would query the Hedera mirror node
      setBalance({
        value: BigInt('1000000000000000000'), // 1 HBAR in tinybar
        symbol: 'HBAR'
      })
    } else {
      setBalance(null)
    }
  }, [address, connectionState])

  // Connect function with improved error handling
  const connect = useCallback(async () => {
    if (!hashconnect) {
      setError('Wallet not initialized')
      return
    }

    // Prevent multiple modal opens
    if (modalOpenedRef.current) {
      console.log('⏳ Modal already open, ignoring request')
      return
    }

    // Prevent opening modal if already connecting or connected
    if (connectionState === HashConnectConnectionState.Connecting || 
        connectionState === HashConnectConnectionState.Paired) {
      console.log('⏳ Already connecting or connected')
      return
    }

    try {
      setError(null)
      modalOpenedRef.current = true
      console.log('🔗 Opening pairing modal...')
      hashconnect.openPairingModal()
      
      // Safety timeout to reset modal flag if user closes modal without completing connection
      modalTimeoutRef.current = setTimeout(() => {
        if (modalOpenedRef.current && !sessionData) {
          console.log('⏰ Modal timeout - resetting flag (no session established)')
          modalOpenedRef.current = false
        }
      }, 30000) // 30 second timeout
      
    } catch (error) {
      console.error('❌ Failed to open pairing modal:', error)
      setError(error instanceof Error ? error.message : 'Failed to connect to wallet')
      modalOpenedRef.current = false // Reset flag only on error
    }
  }, [hashconnect, connectionState, sessionData])

  // Disconnect function with proper cleanup
  const disconnect = useCallback(async () => {
    if (!hashconnect) return
    
    try {
      console.log('🔌 Disconnecting wallet...')
      
      // Clear timeout and reset modal flag first
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current)
        modalTimeoutRef.current = null
      }
      modalOpenedRef.current = false
      
      // Disconnect from HashConnect
      await hashconnect.disconnect()
      
      console.log('✅ Wallet disconnected successfully')
      
    } catch (error) {
      console.error('❌ Failed to disconnect:', error)
      setError(error instanceof Error ? error.message : 'Failed to disconnect wallet')
    }
  }, [hashconnect])

  // Force reset function for emergency cases
  const forceReset = useCallback(() => {
    console.log('🚨 Force resetting HashConnect...')
    
    // Clear all storage
    clearWalletConnectStorage()
    
    // Reset global singleton
    globalHashConnectInstance = null
    globalInitPromise = null
    
    // Reset modal state
    modalOpenedRef.current = false
    
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current)
      modalTimeoutRef.current = null
    }
    
    // Reset all state
    setHashconnect(null)
    setConnectionState(HashConnectConnectionState.Disconnected)
    setSessionData(null)
    setAddress(null)
    setBalance(null)
    setIsConnecting(false)
    setError(null)
    
    console.log('✅ Force reset completed')
  }, [clearWalletConnectStorage])

  // Utility functions
  const formatAddress = useCallback((addr: string) => {
    if (!addr) return ''
    // For Hedera account IDs like 0.0.123456
    if (addr.includes('.')) {
      return addr
    }
    // For other formats, show first 6 and last 4 characters
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }, [])

  const formatBalance = useCallback((bal: any) => {
    if (!bal) return '0'
    // Convert from tinybar to HBAR (1 HBAR = 100,000,000 tinybar)
    const hbarAmount = Number(bal.value) / 100000000
    return hbarAmount.toFixed(4)
  }, [])

  // Computed values
  const isConnected = useMemo(() => 
    connectionState === HashConnectConnectionState.Paired && !!sessionData, 
    [connectionState, sessionData]
  )
  
  const isDisconnected = useMemo(() => 
    connectionState === HashConnectConnectionState.Disconnected, 
    [connectionState]
  )

  // Chain object for current Hedera network
  const chain = useMemo(() => {
    const networkConfig = import.meta.env.VITE_HEDERA_NETWORK || 'mainnet'
    const networkName = networkConfig.charAt(0).toUpperCase() + networkConfig.slice(1).toLowerCase()
    
    return {
      id: networkConfig.toLowerCase() === 'testnet' ? 296 : networkConfig.toLowerCase() === 'previewnet' ? 297 : 295,
      name: `Hedera ${networkName}`
    }
  }, [])

  return {
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    chain,
    balance,
    connect,
    disconnect,
    formatAddress,
    formatBalance,
    connectionState,
    sessionData,
    hashconnect,
    error,
    forceReset, // Emergency reset function
    // Additional methods for compatibility
    openModal: connect,
    closeModal: disconnect
  }
}