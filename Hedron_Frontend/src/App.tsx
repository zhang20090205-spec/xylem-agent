import { useState } from 'react';
import { Menu, X, Wallet, PanelLeftOpen, Wifi, WifiOff, AlertCircle } from 'lucide-react';
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

function App() {
  // Initialize theme
  useTheme();
  
  // Real wallet connection using HashConnect
  const { 
    address, 
    isConnected: isWalletConnected
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

  // Connection status component
  const ConnectionStatus = ({ className = "" }: { className?: string }) => {
    if (isWSConnecting) {
      return (
        <div className={`flex items-center gap-2 text-yellow-600 dark:text-yellow-400 ${className}`}>
          <Wifi size={16} className="animate-pulse" />
          <span className="text-xs font-medium">Connecting...</span>
        </div>
      );
    }

    if (!isWSConnected) {
      return (
        <div className={`flex items-center gap-2 text-red-600 dark:text-red-400 ${className}`}>
          <WifiOff size={16} />
          <span className="text-xs font-medium">Disconnected</span>
        </div>
      );
    }

    if (!isWalletConnected) {
      return (
        <div className={`flex items-center gap-2 text-orange-600 dark:text-orange-400 ${className}`}>
          <Wallet size={16} />
          <span className="text-xs font-medium">Wallet Required</span>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className={`flex items-center gap-2 text-blue-600 dark:text-blue-400 ${className}`}>
          <Wifi size={16} className="animate-pulse" />
          <span className="text-xs font-medium">Authenticating...</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 text-green-600 dark:text-green-400 ${className}`}>
        <Wifi size={16} />
        <span className="text-xs font-medium">Connected & Ready</span>
      </div>
    );
  };

  const ViewSwitcher = ({ className = "" }: { className?: string }) => (
    <div className={`inline-flex rounded-full border border-theme-border-primary dark:border-gray-700 bg-theme-bg-secondary/60 dark:bg-gray-800/60 text-xs font-medium ${className}`}>
      <button
        onClick={() => setActiveView('agent')}
        className={`px-3 py-1.5 rounded-full transition-all ${activeView === 'agent' ? 'bg-theme-bg-primary dark:bg-gray-900 text-theme-text-primary shadow-sm' : 'text-theme-text-secondary hover:text-theme-text-primary'}`}
      >
        Agente
      </button>
      <button
        onClick={() => setActiveView('defi')}
        className={`px-3 py-1.5 rounded-full transition-all ${activeView === 'defi' ? 'bg-theme-bg-primary dark:bg-gray-900 text-theme-text-primary shadow-sm' : 'text-theme-text-secondary hover:text-theme-text-primary'}`}
      >
        DeFi directo
      </button>
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
    <div className="h-screen bg-theme-bg-primary dark:bg-gray-900 flex transition-colors duration-300 chat-container">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-theme-bg-secondary/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-theme-border-primary dark:border-gray-700 px-4 py-2.5 shadow-theme-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 hover:bg-theme-bg-tertiary dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105 text-theme-text-primary"
          >
            {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1 text-center mx-4">
            <h1 className="font-bold text-theme-text-primary text-base truncate">
              {currentSession?.title || 'Xylem agent'}
            </h1>
            <div className="flex flex-col items-center gap-1">
              <ConnectionStatus />
              {isWalletConnected && address && (
                <TokenBalances accountId={address} variant="compact" />
              )}
              <ViewSwitcher className="mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle variant="compact" />
            <WalletButton variant="compact" />
          </div>
        </div>
      </div>

      {/* Connection Error Alert */}
      {wsError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 max-w-md">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">{wsError}</span>
        </div>
      )}

      {/* Sidebar */}
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

      {/* Main chat area */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
        {/* Desktop header */}
        <div className="hidden lg:block border-b border-theme-border-primary dark:border-gray-700 bg-theme-bg-secondary/95 dark:bg-gray-800/95 backdrop-blur-md px-8 py-4 shadow-theme-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left section with sidebar toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarHidden(!isSidebarHidden)}
                className="p-2 hover:bg-theme-bg-tertiary dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105 text-theme-text-primary"
                aria-label="Show sidebar"
              >
                <PanelLeftOpen size={18} />
              </button>
              
              <div className="h-5 w-px bg-theme-border-primary dark:bg-gray-600" />
              
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-theme-text-primary truncate">
                    {currentSession?.title || 'Xylem agent'}
                  </h1>
                  {currentSession && (
                    <p className="text-xs text-theme-text-secondary font-medium mt-0.5">
                      {currentSession.messages.length} messages
                    </p>
                  )}
                </div>
                
                {isWalletConnected && address && (
                  <div className="flex-shrink-0 ml-4">
                    <TokenBalances accountId={address} variant="compact" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Right section with controls */}
            <div className="flex items-center gap-3 ml-4">
              <ViewSwitcher />
              <ConnectionStatus />
              
              {isSidebarHidden && (
                <button
                  onClick={handleNewChat}
                  className="px-3 py-2 bg-theme-accent hover:bg-theme-accent-hover text-white rounded-lg transition-all duration-200 hover:scale-105 text-sm font-medium"
                >
                  New Chat
                </button>
              )}
              
              <ThemeToggle />
              <WalletButton />
            </div>
          </div>
        </div>

        {/* Chat messages area */}
        <div className="flex-1 flex flex-col pt-16 lg:pt-0 min-h-0 overflow-hidden chat-messages-area">
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

          {/* Message input */}
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

      {/* Token Debugger - only show in development */}
      {import.meta.env.DEV && (
        <TokenDebugger accountId={address} />
      )}
    </div>
  );
}

export default App;
