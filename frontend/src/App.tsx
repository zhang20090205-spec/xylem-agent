import { useEffect, useState } from 'react';
import { AlertCircle, Menu, PanelLeftOpen, Wallet, Wifi, WifiOff, X } from 'lucide-react';
import ChatSidebar from './components/ChatSidebar';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import ThemeToggle from './components/ThemeToggle';
import WalletButton from './components/WalletButton';
import TokenBalances from './components/TokenBalances';
import TokenDebugger from './components/TokenDebugger';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { useWallet } from './hooks/useWallet';
import DefiDataHub from './pages/DefiDataHub';

type ViewMode = 'agent' | 'defi';

const formatUtcTime = () =>
  new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });

function App() {
  useTheme();

  const {
    address,
    isConnected: isWalletConnected,
    chain,
  } = useWallet();

  const {
    sessions,
    currentSession,
    isLoading,
    isConnected: isWSConnected,
    isConnecting: isWSConnecting,
    isAuthenticated,
    wsError,
    createNewSession,
    selectSession,
    deleteSession,
    renameSession,
    sendMessage,
  } = useChat();

  const [message, setMessage] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [activeView, setActiveView] = useState<ViewMode>('agent');
  const [utcTime, setUtcTime] = useState(formatUtcTime);

  useEffect(() => {
    const timer = window.setInterval(() => setUtcTime(formatUtcTime()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSendMessage = async () => {
    if (message.trim() && !isLoading && isWSConnected && isAuthenticated && isWalletConnected) {
      const messageToSend = message;
      setMessage('');
      await sendMessage(messageToSend);
    }
  };

  const handleSendPrompt = async (promptMessage: string) => {
    if (promptMessage.trim() && !isLoading && isWSConnected && isAuthenticated && isWalletConnected) {
      await sendMessage(promptMessage);
    }
  };

  const handleNewChat = () => {
    createNewSession();
    setIsMobileSidebarOpen(false);
  };

  const handleSelectChat = (sessionId: string) => {
    selectSession(sessionId);
    setIsMobileSidebarOpen(false);
  };

  const statusCode = isWSConnecting
    ? 'SYNC'
    : !isWSConnected
      ? 'OFFLINE'
      : !isWalletConnected
        ? 'AWAIT WALLET'
        : !isAuthenticated
          ? 'AUTH'
          : 'NORMAL';

  const statusTone = statusCode === 'NORMAL'
    ? 'text-emerald-100'
    : statusCode === 'OFFLINE'
      ? 'text-red-200'
      : 'text-orange-100';

  const ConnectionStatus = ({
    className = '',
    compact = false,
  }: {
    className?: string;
    compact?: boolean;
  }) => {
    const walletStatusLabel = compact ? 'WALLET / 钱包' : 'WALLET REQUIRED / 需要钱包';

    if (isWSConnecting) {
      return (
        <div className={`ether-micro ether-label flex items-center gap-2 ${className}`}>
          <Wifi size={14} className="animate-pulse" />
          <span>SYNCING / 连接中</span>
        </div>
      );
    }

    if (!isWSConnected) {
      return (
        <div className={`ether-micro text-red-200/80 flex items-center gap-2 ${className}`}>
          <WifiOff size={14} />
          <span>OFFLINE / 已断开</span>
        </div>
      );
    }

    if (!isWalletConnected) {
      return (
        <div className={`ether-micro text-orange-100/80 flex items-center gap-2 ${className}`}>
          <Wallet size={14} />
          <span className="whitespace-nowrap">{walletStatusLabel}</span>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className={`ether-micro text-sky-100/80 flex items-center gap-2 ${className}`}>
          <Wifi size={14} className="animate-pulse" />
          <span>AUTH / 认证中</span>
        </div>
      );
    }

    return (
      <div className={`ether-micro text-emerald-100/80 flex items-center gap-2 ${className}`}>
        <Wifi size={14} />
        <span>ONLINE / 可使用</span>
      </div>
    );
  };

  const ViewSwitcher = ({ className = '' }: { className?: string }) => (
    <div className={`inline-flex items-center gap-1 border border-white/15 bg-white/5 px-1 py-1 backdrop-blur-md ${className}`}>
      {[
        { value: 'agent' as const, label: 'AI 助手', code: 'AGENT' },
        { value: 'defi' as const, label: 'DeFi 直连', code: 'DEFI' },
      ].map((item) => (
        <button
          key={item.value}
          onClick={() => setActiveView(item.value)}
          aria-pressed={activeView === item.value}
          className={`ether-nav-button ether-micro px-3 py-1.5 transition-colors ${
            activeView === item.value ? 'bg-white/12 text-white' : 'hover:bg-white/8'
          }`}
          title={item.label}
        >
          {item.code}
        </button>
      ))}
    </div>
  );

  const StatusCluster = ({ compact = false }: { compact?: boolean }) => (
    <div className={`ether-micro ${compact ? 'text-left' : 'text-right'} ether-label space-y-1`}>
      <div className={`font-semibold ${statusTone}`}>SYS.OP. {statusCode}</div>
      <div>{chain?.name ? `NET ${chain.name.toUpperCase()}` : 'NET HEDERA'}</div>
      <div>{utcTime} UTC</div>
    </div>
  );

  if (activeView === 'defi') {
    return (
      <DefiDataHub
        address={address || null}
        isWalletConnected={isWalletConnected}
        connectionStatus={<ConnectionStatus />}
        onBackToAgent={() => setActiveView('agent')}
        viewSwitcher={({ className = '' } = {}) => <ViewSwitcher className={className} />}
      />
    );
  }

  return (
    <div className="ether-shell h-screen flex transition-colors duration-300 chat-container">
      <div className="ether-content flex w-full">
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 border-b border-white/12 bg-[#0e2530]/55 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="ether-button flex h-10 w-10 items-center justify-center"
              aria-label={isMobileSidebarOpen ? '关闭侧边栏' : '打开侧边栏'}
            >
              {isMobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="ether-micro ether-label truncate">ETHER // XYLEM</div>
              <div className="ether-serif truncate text-2xl text-white/90">
                {currentSession?.title || 'Xylem agent'}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ConnectionStatus compact />
                <ViewSwitcher />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="compact" />
              <WalletButton variant="compact" />
            </div>
          </div>
        </div>

        {wsError && (
          <div className="ether-panel fixed top-20 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 px-4 py-2 text-red-100">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">{wsError}</span>
          </div>
        )}

        {!isSidebarHidden && (
          <ChatSidebar
            sessions={sessions}
            currentSessionId={currentSession?.id || null}
            onToggleSidebar={() => setIsSidebarHidden(true)}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onDeleteChat={deleteSession}
            onRenameChat={renameSession}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col lg:ml-0">
          <header className="hidden flex-shrink-0 px-8 py-6 lg:block">
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-6">
              <div className="space-y-6">
                <div>
                  <div className="ether-micro ether-label">ETHER // SYNCHRONOUS AGENT</div>
                  <div className="mt-5 flex items-center gap-8">
                    <button
                      onClick={() => setIsSidebarHidden(!isSidebarHidden)}
                      className="ether-micro ether-nav-button flex items-center gap-2"
                      aria-label={isSidebarHidden ? '显示侧边栏' : '隐藏侧边栏'}
                    >
                      <PanelLeftOpen size={14} />
                      ROOMS
                    </button>
                    <button onClick={handleNewChat} className="ether-micro ether-nav-button">
                      NEW SIGNAL
                    </button>
                    <button onClick={() => setActiveView('defi')} className="ether-micro ether-nav-button">
                      ARCHIVE
                    </button>
                  </div>
                </div>
                {isSidebarHidden && (
                  <button onClick={handleNewChat} className="ether-button px-4 py-2">
                    新对话
                  </button>
                )}
              </div>

              <div className="flex flex-col items-center gap-3">
                <ViewSwitcher />
                <div className="ether-micro ether-faint">
                  {currentSession ? `${currentSession.messages.length} MESSAGES` : 'LISTENING STANDBY'}
                </div>
              </div>

              <div className="flex flex-col items-end gap-4">
                <StatusCluster />
                <div className="flex flex-wrap justify-end gap-2">
                  <ConnectionStatus />
                  {isWalletConnected && address && (
                    <TokenBalances accountId={address} variant="compact" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <WalletButton />
                </div>
              </div>
            </div>
          </header>

          <div className="chat-messages-area flex min-h-0 flex-1 flex-col overflow-hidden pt-20 lg:pt-0">
            <ChatArea
              messages={currentSession?.messages || []}
              isLoading={isLoading}
              onExecuteSwap={async (swapMessage: string) => {
                if (isWSConnected && isAuthenticated && isWalletConnected) {
                  await sendMessage(swapMessage);
                }
              }}
              onSendMessage={handleSendPrompt}
            />

            <div className="flex-shrink-0">
              <ChatInput
                message={message}
                setMessage={setMessage}
                onSendMessage={handleSendMessage}
                isLoading={isLoading || !isWSConnected || !isAuthenticated || !isWalletConnected}
                isConnected={isWSConnected && isAuthenticated && isWalletConnected}
              />
            </div>
          </div>
        </div>

        {import.meta.env.DEV && (
          <TokenDebugger accountId={address} />
        )}
      </div>
    </div>
  );
}

export default App;
