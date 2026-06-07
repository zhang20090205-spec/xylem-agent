import React, { useState } from 'react'
import { Wallet, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'
import { projectId } from '../config/hashconnect'

interface WalletButtonProps {
  variant?: 'full' | 'compact'
  className?: string
}

export default function WalletButton({ variant = 'full', className = '' }: WalletButtonProps) {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    chain, 
    balance, 
    connect, 
    disconnect, 
    formatAddress, 
    formatBalance,
    error 
  } = useWallet()
  
  const [showConfigHelp, setShowConfigHelp] = useState(false)
  const hasInvalidProjectId = projectId === 'your-project-id-here' || !projectId

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button 
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting || hasInvalidProjectId}
          className={`
            p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm
            ${error || hasInvalidProjectId
              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
              : isConnected 
                ? 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white' 
                : 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white'
            }
            ${className}
          `}
          aria-label={error || hasInvalidProjectId ? 'Wallet configuration error' : isConnected ? 'Disconnect wallet' : 'Connect wallet'}
        >
          {isConnecting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : error || hasInvalidProjectId ? (
            <AlertCircle size={16} className="text-red-200" />
          ) : isConnected ? (
            <CheckCircle size={16} />
          ) : (
            <Wallet size={16} />
          )}
        </button>
        
        {(error || hasInvalidProjectId) && (
          <button
            onClick={() => setShowConfigHelp(!showConfigHelp)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-xs hover:bg-yellow-400 transition-colors"
            title="Configuration help"
          >
            <Info size={10} className="text-white" />
          </button>
        )}
        
        {showConfigHelp && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 text-white p-3 rounded-lg shadow-lg z-50 text-xs">
            <h4 className="font-semibold mb-2">Configuration Required</h4>
            <p className="mb-2">To connect wallets, you need a WalletConnect Project ID:</p>
            <ol className="list-decimal list-inside space-y-1 mb-2">
              <li>Go to <a href="https://cloud.walletconnect.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">cloud.walletconnect.com</a></li>
              <li>Create a free account and project</li>
              <li>Copy your Project ID</li>
              <li>Add it to your .env file as VITE_WALLETCONNECT_PROJECT_ID</li>
            </ol>
            <button 
              onClick={() => setShowConfigHelp(false)}
              className="text-blue-400 hover:underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button 
        onClick={isConnected ? disconnect : connect}
        disabled={isConnecting || hasInvalidProjectId}
        className={`
          transition-all duration-200 px-4 py-2.5 rounded-lg flex items-center gap-2.5 font-medium text-sm
          shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]
          border flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed
          ${error || hasInvalidProjectId
            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-red-500/20'
            : isConnected 
              ? 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white border-emerald-500/20' 
              : 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white border-green-500/20'
          }
          ${className}
        `}
      >
        {isConnecting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <div className="text-left">
              <div className="text-sm font-semibold">Connecting...</div>
              <div className="text-xs text-green-100 opacity-90">Please wait</div>
            </div>
          </>
        ) : error || hasInvalidProjectId ? (
          <>
            <AlertCircle size={16} className="text-red-200" />
            <div className="text-left">
              <div className="text-sm font-semibold">Configuration Required</div>
              <div className="text-xs text-red-100 opacity-90">Missing Project ID</div>
            </div>
          </>
        ) : isConnected ? (
          <>
            <div className="relative">
              <CheckCircle size={16} />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold">
                {formatAddress(address!)} • {chain?.name || 'Unknown'}
              </div>
            </div>
          </>
        ) : (
          <>
            <Wallet size={16} />
            <div className="text-left">
              <div className="text-sm font-semibold">Connect Wallet</div>
              <div className="text-xs text-green-100 opacity-90">Via HashConnect</div>
            </div>
          </>
        )}
      </button>
      
      {(error || hasInvalidProjectId) && (
        <button
          onClick={() => setShowConfigHelp(!showConfigHelp)}
          className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs hover:bg-yellow-400 transition-colors"
          title="Configuration help"
        >
          <Info size={12} className="text-white" />
        </button>
      )}
      
      {showConfigHelp && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 text-sm">
          <h4 className="font-semibold mb-3">🔧 Configuration Required</h4>
          <p className="mb-3">To connect Hedera wallets, you need a WalletConnect Project ID:</p>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Go to <a href="https://cloud.walletconnect.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">cloud.walletconnect.com</a></li>
            <li>Create a free account and project</li>
            <li>Copy your Project ID</li>
            <li>Add it to your <code className="bg-gray-700 px-1 rounded">.env</code> file as <code className="bg-gray-700 px-1 rounded">VITE_WALLETCONNECT_PROJECT_ID</code></li>
            <li>Restart your development server</li>
          </ol>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowConfigHelp(false)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              Got it
            </button>
            <a 
              href="https://cloud.walletconnect.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
            >
              Get Project ID
            </a>
          </div>
        </div>
      )}
    </div>
  )
}