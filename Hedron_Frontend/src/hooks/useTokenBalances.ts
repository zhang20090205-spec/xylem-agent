import { useState, useEffect, useCallback, useMemo } from 'react'

// Token definitions for Hedera testnet
export const HEDERA_TOKENS = {
  HBAR: {
    id: 'HBAR',
    name: 'HBAR',
    symbol: 'HBAR',
    decimals: 8,
    icon: '/hedera-hbar-logo.png'
  },
  SAUCE: {
    id: import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' ? '0.0.731861' : '0.0.1183558', // Testnet SAUCE
    name: 'SaucerSwap',
    symbol: 'SAUCE',
    decimals: 6,
    icon: '/SauceIcon.png'
  },
  USDC: {
    id: import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' ? '0.0.456858' : '0.0.1418651', // Testnet USDC
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    icon: '/usd-coin-usdc-logo.png'
  },
  BONZO: {
    id: import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' ? '0.0.123456' : '0.0.2231533', // Testnet BONZO
    name: 'Bonzo',
    symbol: 'BONZO',
    decimals: 8,
    icon: '/BonzoIcon.png'
  },
  WHBAR: {
    id: import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' ? '0.0.5566986' : '0.0.6499836', // Wrapped HBAR
    name: 'Wrapped HBAR',
    symbol: 'WHBAR',
    decimals: 8,
    icon: '/hedera-hbar-logo.png'
  }
} as const

export type TokenSymbol = keyof typeof HEDERA_TOKENS

export interface TokenBalance {
  tokenId: string
  symbol: string
  name: string
  balance: string
  decimals: number
  formattedBalance: string
  usdValue?: number
  icon: string
}

export interface TokenPrices {
  [symbol: string]: number
}

interface UseTokenBalancesReturn {
  balances: TokenBalance[]
  prices: TokenPrices
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const MIRROR_NODE_BASE_URL = import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' 
  ? 'https://mainnet.mirrornode.hedera.com/api/v1'
  : 'https://testnet.mirrornode.hedera.com/api/v1'

// Format balance based on token decimals
const formatBalance = (balance: string, decimals: number): string => {
  try {
    const bigIntBalance = BigInt(balance)
    const divisor = BigInt(10 ** decimals)
    const wholePart = bigIntBalance / divisor
    const fractionalPart = bigIntBalance % divisor
    
    if (fractionalPart === BigInt(0)) {
      return wholePart.toString()
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
    const trimmedFractional = fractionalStr.replace(/0+$/, '')
    
    if (trimmedFractional === '') {
      return wholePart.toString()
    }
    
    return `${wholePart}.${trimmedFractional}`
  } catch (error) {
    console.error('Error formatting balance:', error)
    return '0'
  }
}

// Fetch token prices from CoinGecko and other sources
const fetchTokenPrices = async (): Promise<TokenPrices> => {
  try {
    const prices: TokenPrices = {}
    
    // Fetch HBAR and SAUCE prices from CoinGecko
    try {
      const coingeckoResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph,saucerswap&vs_currencies=usd',
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      )
      
      if (coingeckoResponse.ok) {
        const coingeckoData = await coingeckoResponse.json()
        
        if (coingeckoData['hedera-hashgraph']?.usd) {
          prices.HBAR = coingeckoData['hedera-hashgraph'].usd
        }
        
        if (coingeckoData['saucerswap']?.usd) {
          prices.SAUCE = coingeckoData['saucerswap'].usd
        }
      }
    } catch (error) {
      console.warn('Failed to fetch from CoinGecko:', error)
    }
    
    // Set stable coin prices
    prices.USDC = 1.00
    
    // For tokens without price data, you could fetch from other sources
    // or use mock/default values
    if (!prices.HBAR) prices.HBAR = 0.235 // Fallback price
    if (!prices.SAUCE) prices.SAUCE = 0.052 // Fallback price
    if (!prices.BONZO) prices.BONZO = 0.0045 // Mock price for development
    
    return prices
  } catch (error) {
    console.error('Error fetching token prices:', error)
    // Return fallback prices
    return {
      HBAR: 0.235,
      SAUCE: 0.052,
      USDC: 1.00,
      BONZO: 0.0045
    }
  }
}

// Fetch account balances from Hedera Mirror Node
const fetchAccountBalances = async (accountId: string): Promise<any> => {
  try {
    const response = await fetch(`${MIRROR_NODE_BASE_URL}/accounts/${accountId}`, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching account balances:', error)
    throw error
  }
}

export function useTokenBalances(accountId: string | null): UseTokenBalancesReturn {
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [prices, setPrices] = useState<TokenPrices>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalances = useCallback(async () => {
    if (!accountId) {
      setBalances([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch both account data and prices in parallel
      const [accountData, tokenPrices] = await Promise.all([
        fetchAccountBalances(accountId),
        fetchTokenPrices()
      ])

      setPrices(tokenPrices)

      console.log('🔍 Account data received:', accountData)
      console.log('🔍 Available tokens in account:', accountData.balance?.tokens)

      const tokenBalances: TokenBalance[] = []

      // Add HBAR balance
      if (accountData.balance?.balance) {
        const hbarToken = HEDERA_TOKENS.HBAR
        const formattedBalance = formatBalance(accountData.balance.balance, hbarToken.decimals)
        
        tokenBalances.push({
          tokenId: hbarToken.id,
          symbol: hbarToken.symbol,
          name: hbarToken.name,
          balance: accountData.balance.balance,
          decimals: hbarToken.decimals,
          formattedBalance,
          usdValue: tokenPrices.HBAR ? parseFloat(formattedBalance) * tokenPrices.HBAR : undefined,
          icon: hbarToken.icon
        })
      }

      // Add token balances
      if (accountData.balance?.tokens) {
        console.log('🔍 Processing tokens:', accountData.balance.tokens.length)
        for (const tokenBalance of accountData.balance.tokens) {
          console.log('🔍 Full token object:', tokenBalance)
          
          // Handle different possible structures
          const tokenId = tokenBalance.token_id || tokenBalance.token || tokenBalance.id
          const balance = tokenBalance.balance || '0'
          
          console.log('🔍 Checking token:', tokenId, 'balance:', balance)
          
          if (!tokenId) {
            console.log('⚠️ Token ID is undefined, skipping:', tokenBalance)
            continue
          }
          
          // Find matching token in our predefined list
          const token = Object.values(HEDERA_TOKENS).find(t => t.id === tokenId)
          console.log('🔍 Found token config:', token)
          
          if (token) {
            console.log('🔍 Token balance for', token.symbol, ':', balance)
            if (balance !== '0') {
              const formattedBalance = formatBalance(balance, token.decimals)
              const price = tokenPrices[token.symbol]
              
              console.log('✅ Adding token:', token.symbol, 'formatted balance:', formattedBalance)
              
              tokenBalances.push({
                tokenId: token.id,
                symbol: token.symbol,
                name: token.name,
                balance: balance,
                decimals: token.decimals,
                formattedBalance,
                usdValue: price ? parseFloat(formattedBalance) * price : undefined,
                icon: token.icon
              })
            } else {
              console.log('⚠️ Token has zero balance:', token.symbol)
            }
          } else {
            console.log('⚠️ Unknown token ID:', tokenId)
            // Show unknown tokens with a generic placeholder
            if (balance !== '0') {
              try {
                const formattedBalance = formatBalance(balance, 8) // Default to 8 decimals
                const tokenIdStr = String(tokenId)
                const tokenIdParts = tokenIdStr.includes('.') ? tokenIdStr.split('.') : [tokenIdStr]
                const shortId = tokenIdParts.length > 0 ? tokenIdParts[tokenIdParts.length - 1] : 'Unknown'
                
                // Try to identify tokens by ID
                let tokenName = `Token ${shortId}`
                let tokenSymbol = shortId
                
                // Known testnet token mappings (ordered by priority)
                switch (tokenIdStr) {
                  case '0.0.1183558':
                    tokenName = 'SaucerSwap'
                    tokenSymbol = 'SAUCE'
                    break
                  case '0.0.1418651':
                    tokenName = 'USD Coin'
                    tokenSymbol = 'USDC'
                    break
                  case '0.0.2231533':
                    tokenName = 'Bonzo'
                    tokenSymbol = 'BONZO'
                    break
                  case '0.0.6499836':
                    tokenName = 'Wrapped HBAR'
                    tokenSymbol = 'WHBAR'
                    break
                  case '0.0.5449':
                    tokenName = 'Test Token'
                    tokenSymbol = 'TEST'
                    break
                  default:
                    // Keep the default naming
                    break
                }
                
                tokenBalances.push({
                  tokenId: tokenIdStr,
                  symbol: tokenSymbol,
                  name: tokenName,
                  balance: balance,
                  decimals: 8,
                  formattedBalance,
                  usdValue: undefined,
                  icon: `data:image/svg+xml;base64,${btoa(`
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="16" fill="#9CA3AF"/>
                      <text x="16" y="21" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle" fill="white">${tokenSymbol.slice(0, 3)}</text>
                    </svg>
                  `)}`
                })
              } catch (error) {
                console.error('Error processing unknown token:', error)
              }
            }
          }
        }
      } else {
        console.log('⚠️ No tokens found in account data')
      }

      // Sort tokens by priority (known tokens first, then by symbol)
      const sortedBalances = tokenBalances.sort((a, b) => {
        const knownTokens = ['HBAR', 'SAUCE', 'USDC', 'BONZO', 'WHBAR']
        const aIndex = knownTokens.indexOf(a.symbol)
        const bIndex = knownTokens.indexOf(b.symbol)
        
        // If both are known tokens, use their priority order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex
        }
        
        // Known tokens come first
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        
        // For unknown tokens, sort alphabetically
        return a.symbol.localeCompare(b.symbol)
      })

      console.log('📊 Final token balances to display:', sortedBalances)
      setBalances(sortedBalances)
    } catch (err) {
      console.error('Error fetching token balances:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch balances')
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  // Fetch balances when account ID changes
  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  // Refetch prices periodically (every 5 minutes)
  useEffect(() => {
    if (!accountId) return

    const interval = setInterval(async () => {
      try {
        const newPrices = await fetchTokenPrices()
        setPrices(newPrices)
        
        // Update USD values in existing balances
        setBalances(prev => prev.map(balance => ({
          ...balance,
          usdValue: newPrices[balance.symbol] 
            ? parseFloat(balance.formattedBalance) * newPrices[balance.symbol]
            : balance.usdValue
        })))
      } catch (error) {
        console.error('Error updating prices:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [accountId])

  const refetch = useCallback(async () => {
    await fetchBalances()
  }, [fetchBalances])

  return {
    balances,
    prices,
    isLoading,
    error,
    refetch
  }
}