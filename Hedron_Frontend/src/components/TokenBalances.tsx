import React from 'react'
import { Loader2, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react'
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
      <div className="flex min-w-[140px] items-center gap-2.5 border border-white/12 bg-white/6 px-3 py-2 backdrop-blur-sm">
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
            <div className="text-sm font-semibold text-white/88">
              {formatBalance(balance.formattedBalance)}
            </div>
            <div className="ether-micro ether-faint">
              {balance.symbol}
            </div>
          </div>
          {balance.usdValue && (
            <div className="mt-0.5 text-xs font-medium text-emerald-100/78">
              {formatUsdValue(balance.usdValue)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 border border-white/12 bg-white/6 p-3">
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
          <div className="truncate text-sm font-semibold text-white/88">
            {balance.name}
          </div>
          <div className="font-mono text-sm text-white/88">
            {formatBalance(balance.formattedBalance)}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="ether-micro ether-faint">
            {balance.symbol}
          </div>
          {balance.usdValue && (
            <div className="text-xs text-white/56">
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
        <AlertCircle size={16} className="text-red-200" />
        <span className="ether-micro text-red-100/82">加载余额失败</span>
        <button
          onClick={refetch}
          className="ether-micro text-red-100/82 underline hover:text-white"
        >
          重试
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 size={16} className="animate-spin text-white/56" />
        <span className="ether-micro ether-faint">正在加载余额...</span>
      </div>
    )
  }

  if (balances.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="ether-micro ether-faint">暂无 token 余额</span>
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
            <div className="flex min-w-[60px] items-center border border-white/12 bg-white/6 px-2.5 py-2">
              <span className="text-sm font-medium text-white/58">+{balances.length - 4}</span>
            </div>
          )}
        </div>
        {totalUsdValue > 0 && (
          <div className="flex items-center gap-1.5 border border-emerald-100/18 bg-emerald-300/10 px-2.5 py-1.5">
            <TrendingUp size={14} className="text-emerald-100/82" />
            <span className="text-sm font-semibold text-emerald-50/88">
              ${totalUsdValue < 1000 ? totalUsdValue.toFixed(2) : `${(totalUsdValue / 1000).toFixed(1)}k`}
            </span>
          </div>
        )}
        <button
          onClick={refetch}
          className="p-1.5 text-white/54 transition-colors hover:bg-white/8 hover:text-white"
          title="刷新余额"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="ether-micro text-white/82">TOKEN BALANCES / Token 余额</h3>
        <div className="flex items-center gap-2">
          {totalUsdValue > 0 && (
            <div className="flex items-center gap-1 border border-emerald-100/18 bg-emerald-300/10 px-2 py-1">
              <TrendingUp size={14} className="text-emerald-100/82" />
              <span className="text-sm font-medium text-emerald-50/88">
                总计：${totalUsdValue.toFixed(2)}
              </span>
            </div>
          )}
          <button
            onClick={refetch}
            className="p-1.5 text-white/54 transition-colors hover:bg-white/8 hover:text-white"
            title="刷新余额"
          >
            <RefreshCw size={14} />
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
