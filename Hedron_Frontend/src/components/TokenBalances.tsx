import React from 'react'
import { Loader2, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { useTokenBalances, type TokenBalance } from '../hooks/useTokenBalances'

interface TokenBalancesProps {
  accountId: string | null
  variant?: 'full' | 'compact'
  className?: string
}

interface TokenItemProps {
  balance: TokenBalance
  variant: 'full' | 'compact'
}

const TokenItem: React.FC<TokenItemProps> = ({ balance, variant }) => {
  const formatUsdValue = (usd: number) => {
    if (usd < 0.01) return '<$0.01'
    if (usd < 1) return `$${usd.toFixed(3)}`
    if (usd < 1000) return `$${usd.toFixed(2)}`
    if (usd < 1000000) return `$${(usd / 1000).toFixed(1)}k`
    return `$${(usd / 1000000).toFixed(1)}M`
  }

  const formatBalance = (bal: string) => {
    const num = parseFloat(bal)
    if (num === 0) return '0'
    if (num < 0.001) return '<0.001'
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    if (num < 1000000) return `${(num / 1000).toFixed(1)}k`
    return `${(num / 1000000).toFixed(1)}M`
  }

  // Get the correct icon based on the token symbol
  const getTokenIcon = (symbol: string, currentIcon: string) => {
    switch (symbol.toUpperCase()) {
      case 'HBAR':
        return '/hedera-hbar-logo.png'
      case 'SAUCE':
        return '/SauceIcon.png'
      case 'BONZO':
        return '/BonzoIcon.png'
      case 'USDC':
        return '/usd-coin-usdc-logo.png'
      case 'WHBAR':
        return '/hedera-hbar-logo.png'
      case 'TEST':
        return '/favicon.png'
      default:
        return currentIcon
    }
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 bg-theme-bg-tertiary/50 dark:bg-gray-700/50 rounded-lg border border-theme-border-primary/10 min-w-[140px]">
        <img 
          src={getTokenIcon(balance.symbol, balance.icon)} 
          alt={balance.symbol}
          className="w-6 h-6 rounded-full flex-shrink-0"
          onError={(e) => {
            // Fallback to a generic token icon if image fails to load
            const target = e.currentTarget
            target.src = `data:image/svg+xml;base64,${btoa(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#6366F1"/>
                <text x="12" y="16" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle" fill="white">${balance.symbol.charAt(0)}</text>
              </svg>
            `)}`
          }}
        />
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-theme-text-primary">
              {formatBalance(balance.formattedBalance)}
            </div>
            <div className="text-xs font-medium text-theme-text-secondary uppercase">
              {balance.symbol}
            </div>
          </div>
          {balance.usdValue && (
            <div className="text-xs font-medium text-green-600 dark:text-green-400 mt-0.5">
              {formatUsdValue(balance.usdValue)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-theme-bg-tertiary dark:bg-gray-700/50 rounded-lg">
      <div className="relative">
        <img 
          src={getTokenIcon(balance.symbol, balance.icon)} 
          alt={balance.symbol}
          className="w-8 h-8 rounded-full flex-shrink-0"
          onError={(e) => {
            const target = e.currentTarget
            target.src = `data:image/svg+xml;base64,${btoa(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#6366F1"/>
                <text x="16" y="21" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">${balance.symbol.charAt(0)}</text>
              </svg>
            `)}`
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-theme-text-primary truncate">
            {balance.name}
          </div>
          <div className="text-sm font-mono text-theme-text-primary">
            {formatBalance(balance.formattedBalance)}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-theme-text-secondary uppercase font-medium">
            {balance.symbol}
          </div>
          {balance.usdValue && (
            <div className="text-xs text-theme-text-secondary">
              {formatUsdValue(balance.usdValue)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TokenBalances({ accountId, variant = 'full', className = '' }: TokenBalancesProps) {
  const { balances, isLoading, error, refetch } = useTokenBalances(accountId)

  if (!accountId) {
    return null
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle size={16} className="text-red-500" />
        <span className="text-xs text-red-500">Failed to load balances</span>
        <button
          onClick={refetch}
          className="text-xs text-red-500 hover:text-red-400 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 size={16} className="animate-spin text-theme-text-secondary" />
        <span className="text-xs text-theme-text-secondary">Loading balances...</span>
      </div>
    )
  }

  if (balances.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-theme-text-secondary">No token balances</span>
      </div>
    )
  }

  const totalUsdValue = balances.reduce((sum, balance) => sum + (balance.usdValue || 0), 0)

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 max-w-2xl overflow-x-auto scrollbar-hide">
          {balances.slice(0, 4).map((balance) => (
            <TokenItem key={balance.tokenId} balance={balance} variant="compact" />
          ))}
          {balances.length > 4 && (
            <div className="flex items-center px-2.5 py-2 bg-theme-bg-tertiary dark:bg-gray-700/50 rounded-lg border border-theme-border-primary/10 min-w-[60px]">
              <span className="text-sm font-medium text-theme-text-secondary">+{balances.length - 4}</span>
            </div>
          )}
        </div>
        {totalUsdValue > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/50">
            <TrendingUp size={14} className="text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
              ${totalUsdValue < 1000 ? totalUsdValue.toFixed(2) : `${(totalUsdValue / 1000).toFixed(1)}k`}
            </span>
          </div>
        )}
        <button
          onClick={refetch}
          className="p-1.5 hover:bg-theme-bg-tertiary dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          title="Refresh balances"
        >
          <RefreshCw size={14} className="text-theme-text-secondary hover:text-theme-text-primary" />
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-theme-text-primary">Token Balances</h3>
        <div className="flex items-center gap-2">
          {totalUsdValue > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-md">
              <TrendingUp size={14} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Total: ${totalUsdValue.toFixed(2)}
              </span>
            </div>
          )}
          <button
            onClick={refetch}
            className="p-1.5 hover:bg-theme-bg-tertiary dark:hover:bg-gray-700/50 rounded-md transition-colors"
            title="Refresh balances"
          >
            <RefreshCw size={14} className="text-theme-text-secondary hover:text-theme-text-primary" />
          </button>
        </div>
      </div>
      
      <div className="grid gap-2">
        {balances.map((balance) => (
          <TokenItem key={balance.tokenId} balance={balance} variant="full" />
        ))}
      </div>
    </div>
  )
}