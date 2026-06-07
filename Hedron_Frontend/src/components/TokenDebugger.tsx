import React, { useState, useEffect } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

interface TokenDebuggerProps {
  accountId: string | null
}

interface AccountTokenInfo {
  token: string
  balance: string
}

const MIRROR_NODE_BASE_URL = import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' 
  ? 'https://mainnet.mirrornode.hedera.com/api/v1'
  : 'https://testnet.mirrornode.hedera.com/api/v1'

export default function TokenDebugger({ accountId }: TokenDebuggerProps) {
  const [tokens, setTokens] = useState<AccountTokenInfo[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAccountTokens = async () => {
    if (!accountId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${MIRROR_NODE_BASE_URL}/accounts/${accountId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('🐛 Full account data:', data)
      
      if (data.balance?.tokens) {
        setTokens(data.balance.tokens)
        console.log('🐛 All tokens in account:', data.balance.tokens)
      } else {
        setTokens([])
        console.log('🐛 No tokens found in account')
      }
    } catch (err) {
      console.error('🐛 Error fetching tokens:', err)
          setError(err instanceof Error ? err.message : '获取 token 失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isVisible && accountId) {
      fetchAccountTokens()
    }
  }, [isVisible, accountId])

  if (!accountId) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors"
        title="切换 token 调试器"
      >
        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        调试 Token
      </button>

      {isVisible && (
        <div className="absolute bottom-full right-0 mb-2 w-96 max-h-80 overflow-y-auto bg-gray-900 text-white p-4 rounded-lg shadow-xl border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">账户 Token 调试</h3>
            <button
              onClick={fetchAccountTokens}
              className="text-sm text-blue-400 hover:text-blue-300"
              disabled={isLoading}
            >
              {isLoading ? '加载中...' : '刷新'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-red-900/50 border border-red-700 rounded">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm text-gray-400">
              账户 ID：<span className="text-white font-mono">{accountId}</span>
            </div>
            
            {tokens.length > 0 ? (
              <div>
                <div className="text-sm text-gray-400 mb-2">
                  找到 {tokens.length} 个 token：
                </div>
                {tokens.map((token, index) => {
                  const tokenId = token.token_id || token.token || token.id || '未知'
                  const balance = token.balance || '0'
                  
                  return (
                    <div
                      key={index}
                      className="p-2 bg-gray-800 rounded border border-gray-700"
                    >
                      <div className="text-sm">
                        <div className="text-yellow-400">Token ID：{tokenId}</div>
                        <div className="text-green-400">余额：{balance}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          原始数据：{JSON.stringify(token)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                {isLoading ? '正在加载 token...' : '该账户暂无 token'}
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-500">
              详细日志请查看控制台
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
