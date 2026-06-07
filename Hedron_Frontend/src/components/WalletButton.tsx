import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Info, Loader2, Wallet } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { projectId } from '../config/hashconnect';

interface WalletButtonProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export default function WalletButton({ variant = 'full', className = '' }: WalletButtonProps) {
  const {
    address,
    isConnected,
    isConnecting,
    chain,
    connect,
    disconnect,
    formatAddress,
    error,
    isDemoWallet,
  } = useWallet();

  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const hasInvalidProjectId = !isDemoWallet && (projectId === 'your-project-id-here' || !projectId);
  const hasProblem = error || hasInvalidProjectId;

  const icon = isConnecting ? (
    <Loader2 size={16} className="animate-spin" />
  ) : hasProblem ? (
    <AlertCircle size={16} />
  ) : isConnected ? (
    <CheckCircle size={16} />
  ) : (
    <Wallet size={16} />
  );

  const label = isConnecting
    ? '连接中'
    : hasProblem
      ? '需要配置'
      : isDemoWallet
        ? `DEMO ${formatAddress(address!)}`
      : isConnected
        ? formatAddress(address!)
        : '连接钱包';

  const subLabel = isDemoWallet ? 'Auto-connected demo wallet' : isConnected ? chain?.name || '未知网络' : hasProblem ? '缺少 Project ID' : 'HashConnect';

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={isDemoWallet ? undefined : isConnected ? disconnect : connect}
          disabled={isDemoWallet || isConnecting || hasInvalidProjectId}
          className={`ether-button flex h-10 w-10 items-center justify-center ${
            hasProblem ? 'text-red-100' : isConnected ? 'text-emerald-100' : ''
          } ${className}`}
          aria-label={hasProblem ? '钱包配置错误' : isConnected ? '断开钱包' : '连接钱包'}
        >
          {icon}
        </button>

        {hasProblem && (
          <button
            onClick={() => setShowConfigHelp(!showConfigHelp)}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-300 text-[10px] text-slate-900"
            title="配置帮助"
          >
            <Info size={10} />
          </button>
        )}

        {showConfigHelp && <ConfigHelp compact onClose={() => setShowConfigHelp(false)} />}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={isDemoWallet ? undefined : isConnected ? disconnect : connect}
        disabled={isDemoWallet || isConnecting || hasInvalidProjectId}
        className={`ether-button flex items-center gap-2.5 px-4 py-2.5 ${
          hasProblem ? 'text-red-100' : isConnected ? 'text-emerald-100' : ''
        } ${className}`}
      >
        {icon}
        <div className="text-left">
          <div className="text-[12px] leading-tight tracking-[0.14em]">{label}</div>
          <div className="mt-0.5 text-[10px] leading-tight tracking-[0.14em] text-white/48">{subLabel}</div>
        </div>
      </button>

      {hasProblem && (
        <button
          onClick={() => setShowConfigHelp(!showConfigHelp)}
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-300 text-slate-900"
          title="配置帮助"
        >
          <Info size={12} />
        </button>
      )}

      {showConfigHelp && <ConfigHelp onClose={() => setShowConfigHelp(false)} />}
    </div>
  );
}

function ConfigHelp({ compact = false, onClose }: { compact?: boolean; onClose: () => void }) {
  return (
    <div
      className={`ether-panel absolute right-0 top-full z-50 mt-2 text-sm text-white/86 ${
        compact ? 'w-80 p-3' : 'w-96 p-4'
      }`}
    >
      <h4 className="ether-micro mb-3 text-white">WALLET CONFIG / 需要配置</h4>
      <p className="mb-3">连接 Hedera 钱包需要 WalletConnect Project ID：</p>
      <ol className="mb-4 list-decimal space-y-2 pl-5 text-white/72">
        <li>
          打开{' '}
          <a
            href="https://cloud.walletconnect.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-100 underline"
          >
            cloud.walletconnect.com
          </a>
        </li>
        <li>创建免费账户和项目</li>
        <li>复制你的 Project ID</li>
        <li>
          在 <code className="border border-white/12 bg-black/20 px-1">.env</code> 中设置{' '}
          <code className="border border-white/12 bg-black/20 px-1">VITE_WALLETCONNECT_PROJECT_ID</code>
        </li>
        <li>重启开发服务器</li>
      </ol>
      <div className="flex gap-2">
        <button onClick={onClose} className="ether-button px-3 py-1.5">
          知道了
        </button>
        <a
          href="https://cloud.walletconnect.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ether-button px-3 py-1.5"
        >
          获取 ID
        </a>
      </div>
    </div>
  );
}
